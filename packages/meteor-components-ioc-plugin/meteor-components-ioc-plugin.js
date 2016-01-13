/*global ComponentRootIoc, Package, ReactiveObj, EJSON*/
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
              overrideMixins(component, ioc);
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

function overrideMixins(component, ioc) {
  // Override mixins so that dependencies are injected and
  // each mixin is managed.
  let mixinsFn = component.mixins;
  let mixinsInstalled = true;

  if (typeof mixinsFn === 'function') {
    component.mixins = function () {
      let mixins = mixinsFn.call(this) || [];
      if (mixinsInstalled) return mixins;
      mixinsInstalled = true;

      return mixins.map(function (m, index) {
        let options = {
          transient: false,
          concerns: {
            initializing(mixin) {
              // Ensure that the destroy method only gets called once.
              // This has to be done because the mixin plugin that is
              // defined in meteor-components will call mixin.destroy()
              // just before the component is destroyed and the IOC
              // container will also call destroy when the IOC container
              // is destroyed.
              let destroy = mixin.destroy;
              let destroyed = false;
              if (typeof destroy === 'function') {
                mixin.destroy = function () {
                  if (destroyed) return;
                  destroyed = true;
                  destroy.call(this);
                };
              }
            }
          }
        };

        if (typeof m !== 'function') {
          ioc.factory(`mixin_${index}`, m, options);
        } else {
          ioc.factory(`mixin_${index}`, () => Object.create(m), options);
        }

        return function () {
          return ioc.resolve(`mixin_${index}`);
        };
      });
    };
  }
}

// If the weak dependencies exist then we install the plugin.
if (Package['dschnare:meteor-components'] &&
  Package['dschnare:ioc-container']) {

  const Component = Package['dschnare:meteor-components'].Component;
  const ComponentUtil = Package['dschnare:meteor-components'].ComponentUtil;
  const IocContainer = Package['dschnare:ioc-container'].IocContainer;
  install(Component, ComponentUtil, IocContainer);
}