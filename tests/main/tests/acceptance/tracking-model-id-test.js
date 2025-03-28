import { setComponentTemplate } from '@ember/component';
import { render, settled } from '@ember/test-helpers';
import Component from '@glimmer/component';

import { module, test } from 'qunit';

import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

class Widget extends Model {
  @attr() name;

  get numericId() {
    return Number(this.id);
  }
}

class WidgetList extends Component {
  get sortedWidgets() {
    const { widgets } = this.args;

    return widgets.slice().sort((a, b) => b.numericId - a.numericId);
  }
}

const layout = hbs`
  <ul>
    {{#each this.sortedWidgets as |widget index|}}
      <li class="widget{{index}}">
        <div class="id">ID: {{widget.id}}</div>
        <div class="numeric-id">Numeric ID: {{widget.numericId}}</div>
        <div class="name">Name: {{widget.name}}</div>
        <br/>
      </li>
    {{/each}}
  </ul>
`;

class TestAdapter extends JSONAPIAdapter {
  createRecord() {
    return Promise.resolve({
      data: {
        id: '4',
        type: 'widget',
        attributes: {
          name: 'Contraption',
        },
      },
    });
  }
}

module('acceptance/tracking-model-id - tracking model id', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:widget', Widget);
    owner.register('component:widget-list', setComponentTemplate(layout, WidgetList));
    owner.register('adapter:application', TestAdapter);
    owner.register('serializer:application', JSONAPISerializer);
  });

  test("can track model id's without using get", async function (assert) {
    const store = this.owner.lookup('service:store');
    store.createRecord('widget', { id: '1', name: 'Doodad' });
    store.createRecord('widget', { id: '3', name: 'Gizmo' });
    store.createRecord('widget', { id: '2', name: 'Gadget' });
    this.widgets = store.peekAll('widget');

    await render(hbs`
      <WidgetList @widgets={{this.widgets}} />
    `);
    await settled();

    assert.dom('ul>li+li+li').exists();
    assert.dom('ul>li.widget0>div.name').containsText('Gizmo');
    assert.dom('ul>li.widget1>div.name').containsText('Gadget');
    assert.dom('ul>li.widget2>div.name').containsText('Doodad');

    const contraption = store.createRecord('widget', { name: 'Contraption' });
    await contraption.save();
    await settled();

    assert.dom('ul>li+li+li+li').exists();
    assert.dom('ul>li.widget0>div.name').containsText('Contraption');
    assert.dom('ul>li.widget1>div.name').containsText('Gizmo');
    assert.dom('ul>li.widget2>div.name').containsText('Gadget');
    assert.dom('ul>li.widget3>div.name').containsText('Doodad');
  });
});
