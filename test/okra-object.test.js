'use strict'

var chai = require('chai')
var expect = chai.expect
var should = chai.should()

describe('Okra Instance Test(s)', function () {
  // Created Instance
  var Okra = require('../src/Okra/index.js')
  var instance = new Okra('ejYsmsdajjsdhdj32y6eegyi73468ew6a.hiadfuadhjajdxnalPSIUWwUO83yuq08j.aydgof8we40yue8gauaujld', false)

  it('should have a function [mergeNewOptions]', function () {
    /* eslint-disable no-unused-expressions */
    expect((typeof instance.getIdentityByOptions === 'function')).to.be.true
    expect((typeof instance.getCustomerByIdentity === 'function')).to.be.true
    /* eslint-enable no-unused-expressions */
  })

  it('should throw an error if method is called without required arguments', function () {
    try {
      instance.getIdentityByOptions()
    } catch (err) {
      should.exist(err)
    }
  })

  it('should throw an error if method is called with any arguments other than an object', function () {
    try {
      instance.getCustomerByIdentity([])
    } catch (err) {
      should.exist(err)
    }
  })
})
