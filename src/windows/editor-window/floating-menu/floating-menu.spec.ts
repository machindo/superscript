import anyTest, { TestInterface } from 'ava'
import proxyquire from 'proxyquire'

import { EditorPane } from '../editor-pane/editor-pane'

import { FloatingMenu as OriginalFloatingMenu } from './floating-menu'

interface FloatingMenuModule {
  FloatingMenu: typeof OriginalFloatingMenu
}

const { FloatingMenu } = proxyquire<FloatingMenuModule>('./floating-menu', {
  'floating-menu.vue.html': {
    WithRender(_: string) { return null }
  }
})

const test = anyTest as TestInterface<{ component: OriginalFloatingMenu }>

test.beforeEach(t => {
  t.context.component = new FloatingMenu()
  t.context.component.$parent = {
    $el: {
      scrollTop: 123
    },
    editor: {
      focus() { return }
    }
  } as EditorPane
})

test('Component is constructed', t => t.truthy(t.context.component))

test('isShown() shows the component', t => {
  t.falsy(t.context.component.isShown)
  t.context.component.show()
  t.truthy(t.context.component.isShown)
})

test('hide() hides the component', t => {
  t.context.component.show()
  t.context.component.hide()
  t.falsy(t.context.component.isShown)
  t.is(t.context.component.hoveredIndex, -1)
})

test('reset() hides the component and removes all items', t => {
  t.context.component.items.push({ label: 'test 1', click() { return } })
  t.context.component.items.push({ label: 'test 2', click() { return } })
  t.context.component.reset()
  t.falsy(t.context.component.isShown)
  t.is(t.context.component.hoveredIndex, -1)
  t.is(t.context.component.items.length, 0)
})

test('click() hides the component and removes all items', t => {
  let testy = 0

  t.context.component.items.push({ label: 'test 1', click() { testy++ } })
  t.context.component.items.push({ label: 'test 2', click() { testy-- } })

  t.context.component.click(0)
  t.is(testy, 1)

  t.context.component.click(0)
  t.is(testy, 2)

  t.context.component.click(1)
  t.is(testy, 1)
})

test('click() focuses the editor', t => {
  let didFocus = false

  t.context.component.$parent.editor.focus = () => didFocus = true
  t.context.component.items.push({ label: 'test 1', click() { return } })

  t.context.component.click(0)
  t.true(didFocus)
})
