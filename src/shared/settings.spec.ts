import test from 'ava'
import fs from 'fs-extra'
import path from 'path'
import proxyquire from 'proxyquire'
import sinon from 'sinon'

import until from 'test/until'

import { Settings as OriginalSettings } from './settings'

interface SettingsModule {
  Settings: typeof OriginalSettings
}

const tmpDir = path.join(process.cwd(), 'temp')

const { Settings } = proxyquire<SettingsModule>('./settings', {
  electron: {
    app: {
      getPath(_: string) { return tmpDir }
    },
    'electron-log': console
  }
})

test.before(() => fs.remove(Settings.dir))
test.after(() => Settings.unwatchAll())

test('settings file does not exist', async t => {
  const hasFile = await Settings.has('anySettings')
  t.false(hasFile)
})

test('getting a nonexistant returns default', async t => {
  const data = await Settings.get<object>('anySettings')
  t.falsy(Object.keys(data).length)
})

test('getting a nonexistant file returns fallback', async t => {
  const data = await Settings.get('anySettings', 'abc')
  t.is(data, 'abc')
})

test('saves data to file', async t => {
  await Settings.set('testSetting1', { prop: '123' })
  const fileExists = await fs.pathExists(path.join(Settings.dir, 'testSetting1.json'))
  t.true(fileExists)
})

test('getting an existant file returns data', async t => {
  await Settings.set('testSetting2', { prop: '12345' })
  const data = await Settings.get('testSetting2', { prop: 'xxx' })
  t.is(data.prop, '12345')
})

test('watcher reports on changed file', async t => {
  await Settings.set('testSetting3', { prop: '12345' })
  const watcher = await Settings.watch('testSetting3')
  const spy = sinon.spy()

  t.truthy(watcher)

  watcher.on('change', spy)

  await Settings.set('testSetting3', { prop: 'abcde' })
  await until(() => spy.called)

  t.deepEqual(spy.args[0][0], { prop: 'abcde' })
})

test.todo('static unwatchAll')

test.serial('settings instance saves data to file', async t => {
  const setting = new Settings<{ prop: string }>('testSetting4')
  t.truthy(setting)
  await setting.set({ prop: '123' })
  const fileExists = await fs.pathExists(path.join(Settings.dir, 'testSetting4.json'))
  t.true(fileExists)
})

test.serial('settings are retrieved from instance', async t => {
  const setting = new Settings<{ prop: string }>('testSetting4')
  const data = await setting.get()
  t.deepEqual(data, { prop: '123' })
})

test('file creation is emitted', async t => {
  const settingA = new Settings<{ prop: string }>('testSetting5')

  const settingB = new Settings<{ prop: string }>('testSetting5')
  const spy = sinon.spy()

  settingA.on('add', spy)

  await settingB.set({ prop: 'xyz' })
  await until(() => spy.called)

  settingA.unwatch()
  settingB.unwatch()

  t.deepEqual(spy.args[0][0], { prop: 'xyz' })
})

test('file change is emitted', async t => {
  const settingA = new Settings<{ prop: string }>('testSetting6')
  await settingA.set({ prop: 'abc' })

  const settingB = new Settings<{ prop: string }>('testSetting6')
  const spy = sinon.spy()

  settingB.on('change', spy)

  await settingA.set({ prop: 'xyz' })
  await until(() => spy.called)

  settingA.unwatch()
  settingB.unwatch()

  t.deepEqual(spy.args[0][0], { prop: 'xyz' })
})

test('file deletion is emitted', async t => {
  const settingA = new Settings('testSetting7')
  await settingA.set({ prop: 'abc' })

  const settingB = new Settings('testSetting7')
  const addSpy = sinon.spy()
  const spyC = sinon.spy()
  const unlinkSpy = sinon.spy()
  settingB.on('add', addSpy)
  settingB.on('change', spyC)
  settingB.on('unlink', unlinkSpy)

  await until(() => addSpy.called, { errorOnTimeout: false })
  await fs.remove(path.join(Settings.dir, 'testSetting7.json'))
  await until(() => unlinkSpy.called)

  settingA.unwatch()
  settingB.unwatch()

  t.true(unlinkSpy.called)
})

test('instance shows existance of file', async t => {
  const setting = new Settings('testSetting8')
  t.false(await setting.exists())

  await setting.set({ iExist: true })

  t.true(await setting.exists())
})
