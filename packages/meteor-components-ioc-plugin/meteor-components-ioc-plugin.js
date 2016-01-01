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

    let component = templateInstance.view.ioc.resolve(componentName);

    installDataContext(component, templateInstance);

    return component;
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

function installDataContext(component, templateInstance) {
  let dataContext = null;

  templateInstance.autorun(function (c) {
    let data = Template.currentData();

    if (c.firstRun) {
      dataContext = new ReactiveObj(data, {
        transform(value) {
          return EJSON.clone(value);
        }
      });
    } else {
      dataContext.set([], data);
    }
  });

  // Override the component's data() method to optionally accept
  // a path to retrieve from the data context. The path will be
  // reactive since it's being managed by a ReactiveObj instance.
  // If no path is specified then data() returns the non-reactive
  // data context as usual.
  component.data = function (path) {
    if (arguments.length === 0) {
      return templateInstance.data;
    }
    return dataContext ? dataContext.get(path) : null;
  };

  templateInstance.view.template.helpers({
    data(path) {
      return  dataContext ? dataContext.get(path) : null;
    }
  });
}

// If the weak dependencies exist then we install the plugin.
if (Package['dschnare:meteor-components'] &&
  Package['dschnare:ioc-container']) {

  const Component = Package['dschnare:meteor-components'].Component;
  const ComponentUtil = Package['dschnare:meteor-components'].ComponentUtil;
  const IocContainer = Package['dschnare:ioc-container'].IocContainer;
  install(Component, ComponentUtil, IocContainer);
}