/*jslint node: true */
"use strict";

exports.port = null;
//exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = true;

exports.storage = 'sqlite';

exports.hub = 'byteball.org/bb';
exports.deviceName = 'Faucet';
exports.permanent_pairing_secret = '0000';
exports.control_addresses = [''];
exports.payout_address = '';

exports.bIgnoreUnpairRequests = true;
exports.bSingleAddress = false;

exports.KEYS_FILENAME = 'keys.json';

console.log('finished faucet conf');
