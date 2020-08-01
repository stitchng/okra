'use strict'

const got = require('got')
const querystring = require('querystring')
const _ = require('lodash')

const apiEndpoints = {
  getCustomerByIdentity: {
    path: '/customers/get',
    method: 'POST',
    send_json: true,
    params: { type$: String, value$: String, page: Number, limit: Number },
    param_defaults: { page: 1, limit: 1 },
    route_params: null
  },
  getIdentityByOptions: {
     path: '/identity/byOptions',
     method: 'POST',
     send_json: true,
     params: { options$: Object, page: Number, limit: Number },
     route_params: null
  }
}

/*
 * Provides a convenience extension to _.isEmpty which allows for
 * determining an object as being empty based on either the default
 * implementation or by evaluating each property to undefined, in
 * which case the object is considered empty.
 */
_.mixin(function () {
  // reference the original implementation
  var _isEmpty = _.isEmpty
  return {
    // If defined is true, and value is an object, object is considered
    // to be empty if all properties are undefined, otherwise the default
    // implementation is invoked.
    isEmpty: function (value, defined) {
      if (defined && _.isObject(value)) {
        return !_.some(value, function (value, key) {
          return value !== undefined
        })
      }
      return _isEmpty(value)
    }
  }
}())

const isLiteralFalsey = (variable) => {
  return (variable === '' || variable === false || variable === 0)
}

const checkTypeName = (target, type) => {
  let typeName = ''
  if (isLiteralFalsey(target)) {
    typeName = (typeof target)
  } else {
    typeName = ('' + (target && target.constructor.name))
  }
  return !!(typeName.toLowerCase().indexOf(type) + 1)
}

const isTypeOf = (value, type) => {
  let result = false

  type = type || []

  if (typeof type === 'object') {
    if (typeof type.length !== 'number') {
      return result
    }

    let bitPiece = 0
    type = [].slice.call(type)

    type.forEach(_type => {
      if (typeof _type === 'function') {
        _type = (_type.name || _type.displayName).toLowerCase()
      }
      bitPiece |= (1 * (checkTypeName(value, _type)))
    })

    result = !!(bitPiece)
  } else {
    if (typeof type === 'function') {
      type = (type.name || type.displayName).toLowerCase()
    }

    result = checkTypeName(value, type)
  }

  return result
}

const setPathName = (config, values) => {
  return config.path.replace(/\{:([\w]+)\}/g, function (
    match,
    string,
    offset) {
    let _value = values[string]
    return isTypeOf(
      _value,
      config.route_params[string]
    )
      ? _value
      : null
  })
}

const _jsonify = (data) => {
  return !data ? 'null'
    : (typeof data === 'object'
      ? (data instanceof Date ? data.toDateString() : (('toJSON' in data) ? data.toJSON().replace(/T|Z/g, ' ') : JSON.stringify(data)))
      : data)
}

const setInputValues = (config, inputs) => {
  let httpReqOptions = {}
  let inputValues = {}
  let label = ''

  switch (config.method) {
    case 'GET':
    case 'HEAD':
      label = 'query'
      break

    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      label = 'body'
      break
  }

  httpReqOptions[label] = {}

  if (config.param_defaults) {
    inputs = Object.assign({}, config.param_defaults, inputs)
  }

  for (var input in config.params) {
    if (config.params.hasOwnProperty(input)) {
      let param = input.replace('$', '')
      let _input = inputs[param]
      let _type = config.params[input]
      let _required = false

      if ((input.indexOf('$') + 1) === (input.length)) {
        _required = true
      }

      if (_input === void 0 || _input === '' || _input === null) {
        if (_required) { throw new Error(`param: "${param}" is required but not provided; please provide as needed`) }
      } else {
        httpReqOptions[label][param] = isTypeOf(_input, _type)
          ? (label === 'query'
            ? querystring.escape(_jsonify(_input))
            : _jsonify(_input))
          : null

        if (httpReqOptions[label][param] === null) {
          throw new Error(`param: "${param}" is not of type ${_type.name}; please provided as needed`)
        }
      }
    }
  }

  inputValues[label] = (label === 'body'
    ? (config.send_form
      ? httpReqOptions[label]
      : JSON.stringify(httpReqOptions[label])
    )
    : querystring.stringify(httpReqOptions[label]))

  return inputValues
}

const makeMethod = function (config) {
  let httpConfig = {
    headers: {
      'Cache-Control': 'no-cache',
      'Accept': 'application/json',
      'Authorization': this.bearerHeaderValue
    },
    json: true
  }

  if (config.send_json) {
    httpConfig.headers['Content-Type'] = httpConfig.headers['Accept']
    httpConfig.form = false
  } else if (config.send_form) {
    httpConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    httpConfig.form = true
  }

  return function (requestParams = {}) {
    let pathname = false
    let payload = false

    if (!isTypeOf(requestParams, 'object')) {
      throw new TypeError('invalid argument type')
    }

    if (!_.isEmpty(requestParams, true)) {
      if (config.params !== null) {
        payload = setInputValues(config, requestParams)
      }

      if (config.route_params !== null) {
        pathname = setPathName(config, requestParams)
      } else {
        pathname = config.path
      }
    } else {
      if (config.params !== null ||
             config.route_params !== null) {
        throw new Error('requestParam(s) Are Not Meant To Be Empty!')
      }
    }

    if (payload === false) {
      payload = {}
    }

    for (let type in payload) {
      if (payload.hasOwnProperty(type)) {
        httpConfig[type] = (type === 'query') ? payload[type] : JSON.parse(payload[type])
      }
    }

    let reqVerb = config.method.toLowerCase()
    let baseUrl = this.httpClientBaseOptions.baseUrl

    return this.httpBaseClient[reqVerb](`${baseUrl}${pathname}`, httpConfig)
  }
}

class OkraAPI {
  constructor (accessToken, isProd = true) {
    /* eslint-disable camelcase */
    var api_base = {
      sandbox: 'https://dev-api.okra.ng/v1' || 'https://api.okra.ng/sandbox',
      live: 'https://api.okra.ng/v1'
    };

    this.bearerHeaderValue = `Bearer ${accessToken}`;

    this.httpClientBaseOptions = {
      baseUrl: (!isProd ? api_base.sandbox : api_base.live)
    }
    /* eslint-enable camelcase */
    this.httpBaseClient = got
  }
}

for (let methodName in apiEndpoints) {
  if (apiEndpoints.hasOwnProperty(methodName)) {
    OkraAPI.prototype[methodName] = makeMethod(apiEndpoints[methodName])
  }
}

module.exports = OkraAPI
