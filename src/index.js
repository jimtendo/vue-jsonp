/**
 * Vue Jsonp By LancerComet at 16:35, 2016.10.17.
 * # Carry Your World #
 *
 * @author: LancerComet
 * @license: MIT
 */

var hmacsha1 = require('hmacsha1');

var _timeout = null

var vueJsonp = {
  install: function (Vue, options) {
    Vue.jsonp = jsonp
    Vue.prototype.$jsonp = jsonp

    if (typeof options === 'number') {
      _timeout = options
    }
  }
}

function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/\*/g, "%252A").replace(/\'/g, "%2527");
}

/**
 * JSONP function.
 * @param { String } url Target URL address.
 * @param { Object } params Querying params object.
 * @param { Number } timeout Timeout setting (ms).
 *
 * @example
 *   Vue.jsonp('/url', {
 *     callbackQuery: ''
 *     callbackName: '',
 *     name: 'LancerComet',
 *     age: 26
 *   }, 1000)
 */
function jsonp (url, params, timeout) {
  params = params || {}
  timeout = timeout || _timeout

  return new Promise(function (resolve, reject) {
    if (typeof url !== 'string') {
      throw new Error('[Vue.jsonp] Type of param "url" is not string.')
    }

    var callbackQuery = params.callbackQuery || 'callback'
    var callbackName = params.callbackName || 'jsonp_' + randomStr()

    params[callbackQuery] = callbackName

    // Remove callbackQuery and callbackName.
    delete params.callbackQuery
    delete params.callbackName

    // Pluck out secret (if exists) so we can sign request later
    var secret = params.secret;
    if (secret) {
      // Delete secret from params
      delete params.secret;

      // Add nonce and timestamp
      params.nonce = Math.floor((Math.random() * 1000000000) + 1);
      params.timestamp = Math.floor(Date.now() / 1000);
    }

    // Convert params to querying str.
    var queryStrs = []
    Object.keys(params).sort().forEach(function (queryName) {
      queryStrs = queryStrs.concat(formatParams(queryName, params[queryName]))
    })

    var queryStr = flatten(queryStrs).join('&')

    // If there was a "secret" in the params, sign request
    if (secret) {
      var baseString = 'GET&'+fixedEncodeURIComponent(url)+'&'+fixedEncodeURIComponent(queryStr);
      queryStr += '&signature='+fixedEncodeURIComponent(hmacsha1(atob(secret), baseString));
    }

    // Timeout timer.
    var timeoutTimer = null

    // Setup timeout.
    if (typeof timeout === 'number') {
      timeoutTimer = setTimeout(function () {
        removeErrorListener()
        headNode.removeChild(paddingScript)
        delete window[callbackName]
        reject({ statusText: 'Request Timeout', status: 408 })
      }, timeout)
    }

    // Create global function.
    window[callbackName] = function (json) {
      clearTimeout(timeoutTimer)
      removeErrorListener()
      headNode.removeChild(paddingScript)
      resolve(json)
      delete window[callbackName]
    }

    // Create script element.
    var headNode = document.querySelector('head')
    var paddingScript = document.createElement('script')

    // Add error listener.
    paddingScript.addEventListener('error', onError)

    // Append to head element.
    paddingScript.src = url + (/\?/.test(url) ? '&' : '?') + queryStr
    headNode.appendChild(paddingScript)

    /**
     * Padding script on-error event.
     * @param {Event} event
     */
    function onError (event) {
      removeErrorListener()
      clearTimeout(timeoutTimer)
      reject({
        status: 400,
        statusText: 'Bad Request'
      })
    }

    /**
     * Remove on-error event listener.
     */
    function removeErrorListener () {
      paddingScript.removeEventListener('error', onError)
    }
  })

}

/**
 * Generate random string.
 * @return { String }
 */
function randomStr () {
  return (Math.floor(Math.random() * 100000) * Date.now()).toString(16)
}

/**
 * Format params into querying string.
 * @param {{}}
 * @return {string[]}
 */
function formatParams (queryName, value) {
  queryName = queryName.replace(/=/g, '')
  var result = []

  switch (value.constructor) {
    case String:
    case Number:
    case Boolean:
      result.push(encodeURIComponent(queryName) + '=' + encodeURIComponent(value))
      break

    case Array:
      value.forEach(function (item) {
        result = result.concat(formatParams(queryName + '[]=', item))
      })
      break

    case Object:
      Object.keys(value).forEach(function (key) {
        var item = value[key]
        result = result.concat(formatParams(queryName + '[' + key + ']', item))
      })
      break
  }

  return result
}

/**
 * Flat querys.
 *
 * @param {any} array
 * @returns
 */
function flatten (array) {
  var querys = []
  array.forEach(function (item) {
    if (typeof item === 'string') {
      querys.push(item)
    } else {
      querys = querys.concat(flatten(item))
    }
  })
  return querys
}
