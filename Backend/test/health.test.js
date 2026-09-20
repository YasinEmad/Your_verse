const test = require('node:test');
const assert = require('node:assert/strict');

const { AppController } = require('../dist/app.controller.js');
const { AppService } = require('../dist/app.service.js');

void test('app controller health route returns ok status', () => {
  const controller = new AppController(new AppService());

  assert.deepStrictEqual(controller.health(), { status: 'ok' });
});
