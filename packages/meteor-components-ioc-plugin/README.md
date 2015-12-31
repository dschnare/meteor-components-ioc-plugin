# Overview

A plugin for [dschnare:meteor-components](https://atmospherejs.com/dschnare/meteor-components) that installs custom component creation and destroy hooks that
take care of integrating [dschnare:ioc-container](https://atmospherejs.com/dschnare/ioc-container) for automatic dependency injection.


# Quickstart

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
            items: [
              { title: randomString() },
              { title: randomString() },
              { title: randomString() },
              { title: randomString() },
              { title: randomString() },
              { title: randomString() },
              { title: randomString() }
            ]
          };
        }
      };

      // The Hello component depends on the items array.
      // The items will be injected automatically when
      // the template is wrapped in an App.
      Component.Hello = class {
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
        constructor(item/*, data (optionally available) */) {
          this._item = item;
          // data is a ReactiveVar instance that will get a
          // reactive data context
          // this._item = data.get().item
        }

        helpers() {
          return {
            item: () => this._item.get()
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
        posts: () => PostsCollection,

        // This is how we could define a service with dependencies. These
        // dependencies need to be defined higher up the hierarchy or on
        // the ComponentRootIoc.
        // somethingElse(serviceA, serviceB) {
        //   return {};
        // }
      },

      doStuff() { /*...*/ }
    }

    Component.Widget = {
      // Pull down the App instance
      App: null,
      // Pull down the posts collection
      posts: null,

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

All components will also have their data context available as a dependency
with the name `data`. This service is a `ReactiveVar` that will update when
the data context changes.

For convenience each key of the data context is also available as a dependency
with each key being the name of a service. Each service is a `ReactiveVar` that
will update when the data context changes.

**Example:**

Template code.

    <template name="App">
      {{> Template.contentBlock}}
    </template>

    <template name="ItemRenderer">
      <p>{{item.title}}</p>
    </template>

    <body>
      {{#App}}
        {{#each items}}
          {{> ItemRenderer item=this}}
        {{/each}}
      {{/App}
    </body>

Component code.

    Component.App = class {
      helpers() {
        return {
          items: function () {
            return [
              { title: 'one' },
              { title: 'two' },
              { title: 'three' }
            ];
          }
        };
      }
    }

    // Depends on item being a ReactiveVar instance.
    Component.ItemRenderer = class {
      constructor(item) {
        this._item = item;
      }

      helpers() {
        return {
          item: () => this._item.get();
        };
      }
    }
