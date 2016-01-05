/*global ComponentRootIoc, Package, ReactiveObj, EJSON*/
function install(Component, ComponentUtil, IocContainer) {
  ComponentRootIoc = new IocContainer();

  Component.hookCreateComponent = (componentName, Ctor, templateInstance) => {
    let nearestIoc =
      getNearestIocContainer(templateInstance.view, ComponentRootIoc);

    if (!templateInstance.view.ioc) {
      let ioc = new IocContainer(nearestIoc);
      templateInstance.view.ioc = ioc;
      let newable = typeof Ctor === 'function';
      let factorized = !newable && typeof Ctor.create === 'function';

      ioc.install(
        componentName,
        factorized ? Ctor.create : Ctor,
        {
          newable: newable,
          inject: typeof Ctor.inject === 'function' ?
            Ctor.inject() : Ctor.inject,
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

  Component.onComponentInitialized(function (component, templateInstance) {
    if (typeof component.services === 'function') {
      let ioc = templateInstance.view.ioc;
      let services = component.services();

      for (let key in services) {
        let service = services[key];
        let newable = typeof service === 'function';
        let factorized = !newable && typeof service.create === 'function';

        ioc.install(key, factorized ? service.create : service, {
          inject: typeof service.inject === 'function' ?
            service.inject() : service.inject
        });
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

      return mixins.map(function (Mixin, index) {
        let newable = typeof Mixin === 'function';
        let factorized = !newable && typeof Mixin.create === 'function';

        ioc.install(
          `mixin_${index}`,
          factorized ? Mixin.create : Mixin,
          {
            newable: newable,
            inject: typeof Mixin.inject === 'function' ?
              Mixin.inject() : Mixin.inject,
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
          }
        );

        return {
          create() {
            return ioc.resolve(`mixin_${index}`);
          }
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