/*global Meteor, Component*/
if (Meteor.isClient) {
  function range(min, max) {
    return min + Math.random() * (max - min);
  }

  ComponentRootIoc.factory('TestMixin', () => {
    return {
      name: 'Test',

      configure(value) {
        console.log('mixin configured with:', value);
      },

      ready() {
        console.log('mixin is ready');
      }
    };
  })

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

  Component.App = {
    services() {
      return {
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

  Component.Hello = class {
    static inject() { return ['items']; }

    constructor(items) {
      this._items = items;
    }

    mixins() {
      return [
        {
          name: 'Draggable',
          configure(value) {
            console.log('Draggable configured with:', value);
          }
        }
      ];
    }

    helpers() {
      return {
        items() { return this._items }
      };
    }

    initialize() {
      console.log('Hello#initialize', this._items);
    }

    ready() {
      console.log('Hello#ready', this._items);
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