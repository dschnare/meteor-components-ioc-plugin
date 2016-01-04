/*global ComponentRootIoc, Package, ReactiveObj, EJSON*/

function install(Component, ComponentUtil, IocContainer) {
  ComponentRootIoc = new IocContainer();

  Component.hookCreateComponent = (componentName, Ctor, templateInstance) => {
    let nearestIoc =
      getNearestIocContainer(templateInstance.view, ComponentRootIoc);

    if (!templateInstance.view.ioc) {
      let ioc = new IocContainer(nearestIoc);
      templateInstance.view.ioc = ioc;

      ioc.install(
        componentName,
        Ctor,
        {
          newable: typeof Ctor === 'function',
          inject: typeof Ctor.inject === 'function' ?
            Ctor.inject() : Ctor.inject,
          concerns: {
            initializing(component) {
              component.name = componentName;
              component.templateInstance = templateInstance;
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
        if (Array.isArray(service) &&
          typeof service[service.length - 1] === 'function') {
          // service = [dep1, dep2, dep3, fn]
          ioc.install(key, service.pop(), { inject: service });
        } else {
          ioc.install(key, service, {
            inject: typeof service.inject === 'function' ?
              service.inject() : service.inject
          });
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

// If the weak dependencies exist then we install the plugin.
if (Package['dschnare:meteor-components'] &&
  Package['dschnare:ioc-container']) {

  const Component = Package['dschnare:meteor-components'].Component;
  const ComponentUtil = Package['dschnare:meteor-components'].ComponentUtil;
  const IocContainer = Package['dschnare:ioc-container'].IocContainer;
  install(Component, ComponentUtil, IocContainer);
}