import * as remote from '@electron/remote'

// remote.getCurrentWindow() does not work inside webView in Electron v4, so we're passing in the window ID as a workaround
export function getCurrentWindow() {
  const queryParams = window.location.search.substring(1).split('&')
  const currentWindowId = parseInt(queryParams.find(param => param.startsWith('currentWindowId='))!.substring(16), 10)
  return remote.BrowserWindow.fromId(currentWindowId)
}
