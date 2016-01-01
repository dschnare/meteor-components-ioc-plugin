/*global ComponentRootIoc, Package, ReactiveVar*/

function install(Component, ComponentUtil, IocContainer) {
  ComponentRootIoc = new IocContainer();

  Component.hookCreateComponent = (componentName, Ctor, templateInstance) => {
    let nearestIoc =
      getNearestIocContainer(templateInstance.view, ComponentRootIoc);

    if (!templateInstance.view.ioc) {
      let ioc = new IocContainer(nearestIoc);
      templateInstance.view.ioc = ioc;

      installDataContextKeys(ioc, templateInstance);
      installDataContext(ioc, templateInstance);

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
        ioc.install(key, services[key]);
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

function installDataContext(ioc, templateInstance) {
  let dataVar = null;
  templateInstance.autorun(function (c) {
    let data = Template.currentData();

    if (c.firstRun) {
      dataVar = new ReactiveVar(data);
      ioc.install('data', () => dataVar);
    } else {
      dataVar.curValue = data;
      dataVar.dep.changed();
    }
  });
}

function installDataContextKeys(ioc, templateInstance) {
  let vars = {};
  templateInstance.autorun(function (c) {
    // depend on a reactive data context.
    let data = Template.currentData();

    if (c.firstRun) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (let key in data) {
          vars[key] = new ReactiveVar(data[key]);
          ioc.install(key, () => vars[key]);
        }
      }

      c.onStop(function () {
        for (let key in vars) {
          vars[key] = null;
        }
      });
    } else {
      // We have to forcefully mark each data context key as being
      // changed because the new value could be the same object only
      // with updates. We set the value manually so that we don't
      // inadvertanly cause more than one 'change' event to occur
      // for each data context key.
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (let key in vars) {
          vars[key].curValue = data[key];
          vars[key].dep.changed();
        }
      }
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