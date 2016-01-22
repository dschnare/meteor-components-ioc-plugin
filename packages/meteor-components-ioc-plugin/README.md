# Overview

A plugin for [dschnare:meteor-components](https://atmospherejs.com/dschnare/meteor-components) that installs custom component creation and destroy hooks that
take care of integrating [dschnare:ioc-container](https://atmospherejs.com/dschnare/ioc-container) for automatic dependency injection.


# Quick Start

Create a new project.

    meteor create test-app
    cd test-app

Then replace `test-app.html` with the following markup.

    <body>
      <h1>Welcome to Meteor!</h1>

      {{#App}}
        {{> Hello}}
      {{/App}}
    </body>

    <template name="App">
      {{> Template.contentBlock}}
    </template>

    <template name="Hello">
      {{#each items}}
        {{> Item item=this}}
      {{/each}}
    </template>

    <template name="Item">
      <p>{{item.title}}</p>
    </template>

Now replace `test-app.js` with the following code.

    if (Meteor.isClient) {
      // Helper functions

      function range(min, max) {
        return min + Math.random() * (max - min);
      }

      function randomString(len=15, wordLen=5) {
        let letters = [];
        let w = 0;

        while (letters.length < len) {
          if (Math.random() > 0.5) {
            letters.push(String.fromCharCode(range(97, 122)));
          } else {
            letters.push(String.fromCharCode(range(65, 90)));
          }

          w += 1;
          if (w === wordLen) {
            letters.push(' ');
            w = 0;
          }
        }

        return letters.join('');
      }

      // Components

      // The app component that is the root of our view.
      // This provides a convenient base for us to expose
      // services to our entire component hierachy.
      Component.App = {
        services() {
          return {
            // It's best practice to use JSON keys just in case our code
            // will be obfuscated by a minifier.
            'items': function () {
              return [
                { title: randomString() },
                { title: randomString() },
                { title: randomString() },
                { title: randomString() },
                { title: randomString() },
                { title: randomString() },
                { title: randomString() }
              ]
            }
          };
        }
      };

      // The Hello component depends on the items array.
      // The items will be injected automatically when
      // the template is wrapped in an App.
      Component.Hello = class {
        // It is only neccessary to manually decalare what we want to inject
        // if our code will be obfuscated by a minifier.
        static inject() {
          return ['items'];
        }

        constructor(items) {
          this._items = items;
        }

        helpers() {
          return {
            items() { return this._items }
          };
        }

        initialize() {
          console.log('Hello#initialize', this._items);
        }
      };

      Component.Item = class {
        helpers() {
          return {
            item: () => this.data('item')
          };
        }
      };
    }


# Reference

## ComponentRootIoc

This is the root `IocContainer` that is the root of the entire view hiearchy.
Each component creates and manages its own `IocContainer` that is parented to
the nearest component's `IocContainer` or the `ComponentRootIoc` if there is no
parent component. This makes it possible for each component to expose services
that are only available to its children and grandchildren.

Components can optionally expose services to their children and grandchildren
by providing a `services()` method that returns an object of keys where each
key is the name of a service and whos value is the service to be installed.
This also makes testing components separately much easier since the tests can
provide mocked services without having to modify the components.

**Example:**

    // The wrapping component that pulls in globals or other
    // resources and provides an abstraction to expose these
    // as services to all other components.
    Component.App = {
      services() {
        // This has to be a function because objects will be cloned
        // via Object.create() and we don't want that to happen here.
        // Functions like this are not bound to the component since
        // these are services that provide a value so binding will
        // clobber over the formal parameter list the dependency
        // system uses for injection.
        //
        // Be sure to use JSON keys if your code will be obfuscated.
        'posts': () => PostsCollection
      },

      doStuff() { /*...*/ }
    }

    Component.Widget = class {
      // Manually specify what we want injected in the event
      // our code is obfuscated by a minifier.
      static inject() {
        return ['App', 'posts'];
      }

      construct(App, posts) {
        this.App: App;
        this.posts = posts;
      }

      initialize() {
        // We can now do stuff with the App
        this.App.doStuff();
        // this.App is actually the same as this.parent in this case
      }
    }

    <body>
      {{#App}}
        {{> Widget}}
      {{/App}}
    </body>

**Service Definition**

Services can be defined using object and factory style definitions.

    services() {
      return {
        // Object style (no dependency injection)
        // Will be cloned via Object.create()
        'serviceB': {
          name: 'myService',
          doWork() {
            /* do stuff */
          }
          /* other service instance methods */
        },

        // Factory style
        'serviceC': function (theDep1) {
          return {
            /* service instance properties */
          };
        },

        // Factory style (with configuration)
        'serviceC': (function () {
          function factory(theDep1) {
            return {
              /* service instance properties */
              initialize() {},
              destroy() {}
            };
          }

          factory.inject = ['dep1'];
          /* optionally declare this service as being
            initalizable and destroyable */
          factory.initializable = true;
          factory.destroyable = true;

          return factory;
        })
      }
    }

**Mixins Definition**

Mixins are extended to support dependency injection just like services.

**Example:**

    mixins() {
      [
        // Object style (no dependency injection)
        // Will be cloned via Object.create()
        {
          name: 'myMixin',
          doWork() {
            /* do stuff */
          }
          /* other service instance methods */
        },

        // Factory style
        function (theDep1) {
          /* do stuff with theDep1 */
          return {
            /* the service instance */
          };
        },

        // Factory style (with configuration)
        (function () {
          function factory(theDep1) {
            /* do stuff with theDep1 */
            return {
              /* the service instance */
              initialize() {},
              destroy() {}
            };
          }

          factory.inject = ['dep1'];
          return factory;
        }())
      ];
    }

**Attached Mixins**

Support has been added for mixins to be attached to a component via attached
properties. This allows mixins to be applied to a component when it's used in
a template. All attached properties with the `Mixin.` prefix will be enumerated
and the property name will be used to resolve a mixin service provided by the
component's IOC container. Before resolving, the propery name is suffixed with
`'Mixin'`. The value of the propery will be passed to the mixin's `configure()`
method if one is defined.

**Example:**

    <template name="Hello">
      Hello World!
    </template>

    <body>
      {{> Hello Mixin.Draggable="{'xAxisOnly':true, }" }}
    </body>

    /* since 'Mixin' will be suffixed to the attached property
    name we have to register our mixin with a 'Mixin' suffix */

    ComponentRootIoc.factory('DraggableMixin', () => {
      return {
        initialize() {
          /* initialize mixin */
        },

        /* called if mixin is instantiated as an attached
        property, also, called AFTER initialize()! */
        configure(value) {
          let settings = JSON.parse(value.replace(/'/g, '"'));
          if (settings.xAxisOnly) {
            /* change the dragging behaviour */
          }
        },

        /* rest of lifecycle methods as usual */

        ready() {
        },

        destroy() {
        }
      }
    })

    Component.Hello = {}

If the mixin has a `name` property then it will be referred to when looking up
attached mixins via attached properties. This way you can configure mixins that
have been defined as part of the component's API via its `mixins()` method.

**Example:**

This is a contrived example, but the gist is that any named mixins that are
returned from a component's `mixins()` method can be configured in the template
by using `Mixin.Name` attached mixin properties.

    <template name="Hello">
      Hello {{subject}}!
    </template>

    <body>
      {{> Hello Mixin.Draggable="{'xAxisOnly': true}" Mixin.Subject="Mom" }}
    </body>

    ComponentRootIoc.factory('DraggableMixin', () => {
      return {
        configure(value) {
          /* configure the mixin */
        }
      };
    })

    Component.Hello = class {
      constructor() {
        this.subject = 'World'
      }

      mixins() {
        /* this mixin is configurable because it's named */
        return [
          {
            name: 'Subject',
            configure(value) {
              if (typeof value === 'string' && value) {
                this.owner.subject = value
              }
            }
          }
        ]
      }

      helpers() {
        return {
          subject() {
            return this.subject
          }
        }
      }
    }