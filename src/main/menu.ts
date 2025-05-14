import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import isDev from 'electron-is-dev'
import { Settings } from 'shared/settings'

import { Commands } from './commands'

const recentFilesSubmenu: MenuItemConstructorOptions[] = []

function menuTemplate(): MenuItemConstructorOptions[] {
  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      id: 'newFile',
      label: 'New file',
      accelerator: 'CmdOrCtrl+N',
      click: Commands.newDocument
    }, {
      label: 'New tab',
      accelerator: 'CmdOrCtrl+T',
      click: Commands.newTab
    }, {
      label: 'New window',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: Commands.newWindow
    }, {
      type: 'separator'
    }, {
      label: 'Open...',
      accelerator: 'CmdOrCtrl+O',
      click: Commands.openFile
    }, {
      label: 'Open Recent',
      submenu: recentFilesSubmenu
    }, {
      type: 'separator'
    }, {
      id: 'save',
      label: 'Save',
      accelerator: 'CmdOrCtrl+S',
      click: Commands.saveFile,
      enabled: false
    }, {
      id: 'saveAs',
      label: 'Save As...',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: Commands.saveFileAs,
      enabled: false
    }, {
      id: 'autosave',
      label: 'Autosave',
      click: Commands.toggleAutosave,
      type: 'checkbox',
      enabled: false
    }, {
      type: 'separator'
    }, {
      id: 'revert',
      label: 'Revert File',
      click: Commands.revertFile,
      enabled: false
    }, {
      type: 'separator'
    }, {
      id: 'export',
      label: 'Export...',
      accelerator: 'CmdOrCtrl+E',
      click: Commands.exportWindow,
      enabled: false
    }, {
      id: 'print',
      label: 'Print...',
      accelerator: 'CmdOrCtrl+P',
      click: Commands.print,
      enabled: false
    }
  ]

  const fileMenu: MenuItemConstructorOptions = {
    label: 'File',
    submenu: fileSubmenu
  }

  const editSubmenu: MenuItemConstructorOptions[] = [
    {
      id: 'undo',
      label: 'Undo',
      accelerator: 'CmdOrCtrl+Z',
      click: Commands.undo
    }, {
      id: 'redo',
      label: 'Redo',
      accelerator: 'Shift+CmdOrCtrl+Z',
      click: Commands.redo
    }, {
      type: 'separator'
    }, {
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }, {
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }, {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    }, {
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectAll'
    }, {
      id: 'find',
      label: 'Find',
      accelerator: 'CmdOrCtrl+F',
      click: Commands.triggerFind,
      enabled: false
    }, {
      //   id: 'goTo',
      //   label: 'Go to...',
      //   accelerator: 'CmdOrCtrl+G',
      //   click: Commands.triggerGoTo,
      //   enabled: false
      // }, {
      type: 'separator'
    }, {
      id: 'autocomplete',
      label: 'Toggle Autocomplete',
      accelerator: 'Ctrl+Space',
      click: Commands.toggleAutocomplete,
      enabled: false
    }
  ]

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    role: 'editMenu',
    submenu: editSubmenu
  }

  const formatMenu: MenuItemConstructorOptions = {
    label: 'Format',
    submenu: [
      {
        id: 'bold',
        label: 'Bold',
        accelerator: 'CmdOrCtrl+B',
        click: Commands.bold,
        type: 'checkbox',
        enabled: false
      }, {
        id: 'italic',
        label: 'Italic',
        accelerator: 'CmdOrCtrl+I',
        click: Commands.italic,
        type: 'checkbox',
        enabled: false
      }, {
        id: 'underline',
        label: 'Underline',
        accelerator: 'CmdOrCtrl+U',
        click: Commands.underline,
        type: 'checkbox',
        enabled: false
      }, {
        id: 'strike',
        label: 'Strike through',
        click: Commands.strike,
        type: 'checkbox',
        enabled: false
      }, {
        type: 'separator'
      }, {
        id: 'ul',
        label: 'Bulleted list',
        click: Commands.ul,
        enabled: false
      }, {
        id: 'ol',
        label: 'Numbered list',
        click: Commands.ol,
        enabled: false
      }, {
        id: 'outdent',
        label: 'Decrease indent',
        click: Commands.outdent,
        enabled: false
      }, {
        id: 'indent',
        label: 'Increase indent',
        click: Commands.indent,
        enabled: false
      }
    ]
  }

  const insertMenu: MenuItemConstructorOptions = {
    label: 'Insert',
    submenu: [
      {
        id: 'insertComment',
        label: 'Insert Comment',
        accelerator: 'CmdOrCtrl+/',
        click: Commands.insertComment,
        enabled: false
      }, {
        id: 'insertImage',
        label: 'Insert Image',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: Commands.insertImage,
        enabled: false
      }
    ]
  }

  const viewSubmenu: MenuItemConstructorOptions[] = [
    {
      role: 'togglefullscreen'
    }, {
      type: 'separator'
      // }, {
      //   id: 'toggleDiffToolbar',
      //   label: 'Toggle Diff Toolbar',
      //   click: Commands.toggleDiffToolbar,
      //   enabled: false
    }, {
      id: 'toggleCharacterNumbers',
      label: 'Toggle Character Numbers',
      click: Commands.toggleCharacterNumbers,
      enabled: false
    }, {
      id: 'toggleDictionaryToolbar',
      label: 'Toggle Dictionary Toolbar',
      click: Commands.toggleDictionaryToolbar,
      enabled: false
    }, {
      id: 'toggleFormatToolbar',
      label: 'Toggle Format Toolbar',
      click: Commands.toggleFormatToolbar,
      enabled: false
    }, {
      id: 'toggleLettererToolbar',
      label: 'Toggle Letterer Mode',
      click: Commands.toggleLettererToolbar,
      enabled: false
    }, {
      id: 'toggleWordCount',
      label: 'Toggle Word Count',
      accelerator: 'CmdOrCtrl+D',
      click: Commands.toggleWordCount,
      enabled: false
    }, {
      type: 'separator'
    }, {
      id: 'decreaseFontSize',
      label: 'Decrease Font Size',
      accelerator: 'CmdOrCtrl+-',
      click: Commands.decreaseFontSize,
      enabled: false
    }, {
      id: 'increaseFontSize',
      label: 'Increase Font Size',
      accelerator: 'CmdOrCtrl+Plus',
      click: Commands.increaseFontSize,
      enabled: false
    }, {
      id: 'resetFontSize',
      label: 'Reset Font Size',
      accelerator: 'CmdOrCtrl+0',
      click: Commands.resetFontSize,
      enabled: false
    }
  ]

  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: viewSubmenu
  }

  const reopenMenuItem: MenuItemConstructorOptions = {
    label: 'Reopen Window',
    accelerator: 'CmdOrCtrl+Shift+T',
    enabled: false,
    click() {
      app.emit('activate')
    }
  }

  const windowSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      click: Commands.closeTab
    }, {
      type: 'separator'
    }, {
      label: 'Select Next Tab',
      accelerator: 'Ctrl+Tab',
      click: Commands.selectNextTab
    }, {
      label: 'Select Previous Tab',
      accelerator: 'Shift+Ctrl+Tab',
      click: Commands.selectPreviousTab
    }, {
      type: 'separator'
    },
    reopenMenuItem,
    {
      type: 'separator'
    }
  ]

  const windowMenu: MenuItemConstructorOptions = {
    label: 'Window',
    role: 'window',
    submenu: windowSubmenu
  }

  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'Open Guide',
      click: Commands.openTour
    }, {
      label: 'Report Bugs or Feature Requests',
      click: Commands.openEmail
    }, {
      type: 'separator'
    }, {
      label: 'Learn More',
      click: Commands.openAboutWebsite
    }
  ]

  const helpMenu: MenuItemConstructorOptions = {
    label: 'Help',
    role: 'help',
    submenu: helpSubmenu
  }

  const template: MenuItemConstructorOptions[] = [
    fileMenu,
    editMenu,
    formatMenu,
    insertMenu,
    viewMenu,
    windowMenu,
    helpMenu
  ]

  // If Mac
  if (process.platform === 'darwin') {
    const name = app.getName()

    const appMenu: MenuItemConstructorOptions = {
      label: name,
      submenu: [
        {
          label: `About ${name}`,
          role: 'about'
        }, {
          type: 'separator'
        }, {
          label: `Preferences`,
          accelerator: 'Command+,',
          click: Commands.preferencesWindow
        }, {
          type: 'separator'
        }, {
          label: 'Services',
          role: 'services',
          submenu: []
        }, {
          type: 'separator'
        }, {
          label: `Hide ${name}`,
          accelerator: 'Command+H',
          role: 'hide'
        }, {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideOthers'
        }, {
          label: 'Show All',
          role: 'unhide'
        }, {
          type: 'separator'
        }, {
          role: 'quit'
        }
      ]
    }

    template.unshift(appMenu)

    windowSubmenu.push(
      {
        type: 'separator'
      }, {
      label: 'Bring All to Front',
      role: 'front'
    }
    )
  } else {
    fileSubmenu.push(
      {
        type: 'separator'
      }, {
      role: 'quit'
    }
    )

    editSubmenu.push(
      {
        type: 'separator'
      }, {
      label: `Preferences`,
      accelerator: 'Ctrl+,',
      click: Commands.preferencesWindow
    }
    )
  }

  // If in development mode, add Page Reload and Dev Tools menu items
  if (isDev) {
    viewSubmenu.push(
      {
        type: 'separator'
      }, {
      role: 'reload',
      accelerator: 'Shift+CmdOrCtrl+R'
    }, {
      role: 'forceReload',
      accelerator: ''
    }, {
      role: 'toggleDevTools',
      accelerator: 'Shift+Alt+CmdOrCtrl+I'
    }, {
      type: 'separator'
    }, {
      label: `Reload Tab`,
      click: Commands.reloadTab,
      accelerator: 'CmdOrCtrl+R'
    }, {
      label: `Toggle Tab Developer Tools`,
      click: Commands.toggleTabDevTools,
      accelerator: 'Alt+CmdOrCtrl+I'
    }
    )
  }

  return template
}

async function addRecentFileMenuItems() {
  const files = await Settings.get<string[]>('recentFiles', [])

  recentFilesSubmenu.length = 0

  for (const filename of files) {
    recentFilesSubmenu.push({
      label: filename,
      click: () => {
        Commands.openFilename(filename)
      }
    })
  }

  const focusedWindow = BrowserWindow.getFocusedWindow()

  if (focusedWindow) {
    focusedWindow.webContents.send('updateMenuItems')
  }
}

export async function buildMenu() {
  const autosave = await Settings.get<boolean>('autosave', false)

  await addRecentFileMenuItems()

  const menu = Menu.buildFromTemplate(menuTemplate())
  menu.getMenuItemById('autosave')!.checked = autosave
  Menu.setApplicationMenu(menu)
}

// No active window or PDF window
export function disableMenu() {
  const menu = Menu.getApplicationMenu()!
  menu.getMenuItemById('save')!.enabled = false
  menu.getMenuItemById('saveAs')!.enabled = false
  menu.getMenuItemById('autosave')!.enabled = false
  menu.getMenuItemById('revert')!.enabled = false
  menu.getMenuItemById('export')!.enabled = false
  menu.getMenuItemById('print')!.enabled = false

  menu.getMenuItemById('undo')!.enabled = false
  menu.getMenuItemById('redo')!.enabled = false
  menu.getMenuItemById('find')!.enabled = false
  // menu.getMenuItemById('goTo')!.enabled = false
  menu.getMenuItemById('autocomplete')!.enabled = false

  menu.getMenuItemById('insertComment')!.enabled = false
  menu.getMenuItemById('insertImage')!.enabled = false

  menu.getMenuItemById('toggleDictionaryToolbar')!.enabled = false
  // menu.getMenuItemById('toggleDiffToolbar')!.enabled = false
  menu.getMenuItemById('toggleFormatToolbar')!.enabled = false
  menu.getMenuItemById('toggleLettererToolbar')!.enabled = false
  menu.getMenuItemById('toggleWordCount')!.enabled = false
  menu.getMenuItemById('decreaseFontSize')!.enabled = false
  menu.getMenuItemById('increaseFontSize')!.enabled = false
  menu.getMenuItemById('resetFontSize')!.enabled = false
}
