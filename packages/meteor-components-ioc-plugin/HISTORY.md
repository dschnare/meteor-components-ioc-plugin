# 0.4.1

**Jan. 13, 2016**

chore(meteor-components) Upgrade to latest meteor-components

Upgrade meteor-components and refactor dependency injection to use new
component APIs.


# 0.4.0

**Jan. 7, 2016**

The plugin was brought up to date with the latest changes to meteor-components
and ioc-container.

BREAKING CHANGE: Component services and mixins don't support `{create(){}}`
factory style definitions or class/constructor style definitions.

Before

    Component.MyComponent = class {
      services() {
        return {
          'serviceA': {
            inject: ['a'],
            create(a) {
              return {};
            }
          },

          'serviceC': class {
            static inject() { return ['a'] }

            constructor(a) {}
          },

          'serviceD': SomeClass
        }
      }

      mixins() {
        return [
          {
            inject: ['a'],
            create(a) {
              return {};
            }
          },

          class {
            static inject() { return ['a'] }

            constructor(a) {}
          },

          SomeMixinClass
        ]
      }
    }

After

    Component.MyComponent = class {
      services() {
        return {
          'serviceA': (function () {
            function factory(a) {
              return {};
            }

            factory.inject = ['a'];

            return factory;
          }()),

          'serviceC': (function () {
            class C {
              constructor(a) {}
            }

            function factory(a) {
              return new C(a);
            }

            factory.inject = ['a'];

            return factory;
          }()),

          'serviceD': function () {
            return new SomeClass();
          }
        }
      }

      mixins() {
        return [
          {
          'serviceA': (function () {
            function factory(a) {
              return {};
            }

            factory.inject = ['a'];

            return factory;
          }()),

          (function () {
            class C {
              constructor(a) {}
            }

            function factory(a) {
              return new C(a);
            }

            factory.inject = ['a'];

            return factory;
          }()),

          function () {
            return new SomeMixinClass();
          }
        ]
      }
    }


# 0.3.1

**Jan. 4, 2016**

- Add support for dependency injection into mixins. Any constructor style
  or factory style mixin definition will have its dependencies injected
  automatically. Each component can optionally define a static `inject()`
  method or `inject` array property to specify dependency names.


# 0.3.0

**Jan. 4, 2016**

- Drop support for array style component and service definitions.
  As a workaround use the factory style definition with a static
  `create()` method. To specify dependencies to inject define a
  static `inject()` method or `inject` array property. This change
  unifies component and service definition to conincide with the
  typyical component definition patterns supported by meteor-components.



# 0.2.2

**Jan. 4, 2016**

- Add support for components defined with a static `create()` function.
  Dependencies will be injected into the create function just as if it
  were a normal function or constructor.

- Add support for array-style component definitions like what is accepted
  by `services()` method return value.

- Add support for static `create()` function from a service returned from a
  component's `services()` method.


# 0.2.1

**Jan. 4, 2016**

- Drop the feature of accepting a key path in the `data()` method of the
  components. This feature has been migrated to meteor-components.


# 0.2.0

**Jan. 1, 2016**

- Drop support for depending on keys from the data context. As a workaround
  you pass a key path to your component's `data()` method. This path request
  is a reactive path. Behind the scenes the data is managed by an instance of
  a [ReactiveObj](https://atmospherejs.com/xamfoo/reactive-obj).

- Drop support for depending on `data` to get a reactive data context. As a
  workaround call `currentData()` on the component.

- Override the `data()` method to accept a key path. When calling this method
  with a key path the request the request is reactive.

- Add a `data(path)` helper to all components automatically that provides a
  convenient helper to retrieve keys from the data context in a reactive
  fashion. This allows individual data context paths to be reactive instead of
  the entire data context.

- Look for `inject` static method or array property and pass it as inject
  parameter when installing services on their component's IOC container.


# 0.1.2

**Jan. 1, 2016**

- Add support for static method or property `inject` on components that
  returns an array of dependency names. This is so that if your code is
  obfuscated then dependencies will continue to be resolved correctly.

- Clean up data context service installation so that all logic takes place
  in a autorun.



# 0.1.1

**Dec. 30, 2015**

- Correct example in reference documentation.


# 0.1.0

**Dec. 30, 2015**

- Install data context as service with name `data` as a `ReactiveVar` instance.
  The instance will be marked as `changed` when the data context changes.

- Install each key of the data context as a service as a `ReactiveVar`
  instance. Each instance will be marked as `changed` when the data context
  changes.


# 0.0.1

**Dec. 29, 2015**

- Initial release.