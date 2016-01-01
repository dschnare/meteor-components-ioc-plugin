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