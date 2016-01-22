/*global ComponentRootIoc, Template, Package, EJSON*/
function install(Component, ComponentUtil, IocContainer) {
  ComponentRootIoc = new IocContainer();

  Component.hookCreateComponent = (componentName, factory, templateInstance) => {
    let nearestIoc =
      getNearestIocContainer(templateInstance.view, ComponentRootIoc);

    if (!templateInstance.view.ioc) {
      let ioc = new IocContainer(nearestIoc);
      templateInstance.view.ioc = ioc;
      let newable = typeof Component[componentName] === 'function';

      (newable ? ioc.service : ioc.factory).call(ioc,
        componentName,
        newable ? Component[componentName] : factory,
        {
          transient: false,
          initializable: true,
          destroyable: true,
          concerns: {
            initializing(component) {
              component.name = componentName;
              component.templateInstance = templateInstance;
              initializeMixins(component, templateInstance, ioc);
              Component.trigger('initializing', component, templateInstance);
            }
          }
        }
      );
    }

    return templateInstance.view.ioc.resolve(componentName);
  };

  Component.on('initialized', function (component, templateInstance) {
    if (typeof component.services === 'function') {
      let ioc = templateInstance.view.ioc;
      let services = component.services();

      for (let key in services) {
        let service = services[key];
        if (typeof service === 'function') {
          ioc.factory(key, service, { transient: false });
        } else {
          ioc.factory(key, () => Object.create(service), { transient: false });
        }
      }
    }
  });

  Component.hookDestroyComponent = function (component, templateInstance) {
    if (templateInstance.view.ioc) {
      templateInstance.view.ioc.dispose();
      templateInstance.view.ioc = null;
    }
  };
}

function getNearestIocContainer(view, defaultIoc) {
   do {
    view = view.originalParentView || view.parentView;
  } while (view && !view.ioc);

  return view ? (view.ioc || defaultIoc) : defaultIoc;
}

function initializeMixins(component, templateInstance, ioc) {
  // Override mixins so that dependencies are injected and
  // each mixin is managed.
  let mixinsFn = component.mixins;
  let mixins = [];

  if (typeof mixinsFn === 'function') {
    // Instantiate the mixins right away so that they will be
    // tracked as dependencies for the component instance.
    mixins = mixinsFn.call(this) || [];
    for (let k = 0, len = mixins.length; k < len; k += 1) {
      let m = mixins[k];

      if (typeof m === 'function') {
        m = ioc.inject(m);
        // Update the reference in the array.
        mixins[k] = m;
      }

      // If the mixin is named then we mark it as being registered
      // so it doesn't get added twice to the final mixins list and
      // we also register it as a constant in the IOC container so
      // that it can be configured by an attached mixin property.
      if (typeof m.name === 'string' && m.name) {
        m.$registered = true;
        ioc.constant(m.name + 'Mixin', m);
      }

      let destroy = m.destroy;
      let destroyed = false;
      if (typeof destroy === 'function') {
        m.destroy = function () {
          if (destroyed) return;
          destroyed = true;
          destroy.call(this);
        };
      }
    }
  }

  let attachedMixins = initializeAttachedMixins(
    component,
    templateInstance,
    ioc
  );

  mixins = mixins.concat(attachedMixins);
  component.mixins = () => mixins;
}

function initializeAttachedMixins(component, templateInstance, ioc) {
  let data = templateInstance.data || {};
  let prefix = 'Mixin.';
  let mixins = [];

  for (let key in data) {
    if (key.indexOf(prefix) === 0 && key.length > prefix.length) {
      // Attempt to lookup 'NameMixin' as a service.
      let mixinName = key.substr(prefix.length) + 'Mixin';
      if (ioc.canResolve(mixinName)) {

        let mixin = ioc.resolve(mixinName);
        if (typeof mixin.configure === 'function') {

          // Only call configure() when the key has changed.
          let setting = {};
          templateInstance.autorun(function (c) {
            let data = Template.currentData();
            let newSetting = data[key];
            if (newSetting !== setting) {
              setting = newSetting;
              if (setting !== undefined) {
                mixin.configure(newSetting);
              }
            }
          });
        }
        // If the mixin has already been registered in the IOC container
        // then we don't add it to the mixins list since it will already
        // have been added and tracked. This mixins list is for newly
        // instantiated mixins.
        // NOTE: This is an optimization so that we don't have to filter
        // out registered mixins.
        if (!!mixin.$registered) mixins.push(mixin);
      } else {
        throw new Error('Attached mixin (' + mixinName + ') not found.');
      }
    }
  }

  return mixins;
}

// If the weak dependencies exist then we install the plugin.
if (Package['dschnare:meteor-components'] &&
  Package['dschnare:ioc-container']) {

  const Component = Package['dschnare:meteor-components'].Component;
  const ComponentUtil = Package['dschnare:meteor-components'].ComponentUtil;
  const IocContainer = Package['dschnare:ioc-container'].IocContainer;
  install(Component, ComponentUtil, IocContainer);
}