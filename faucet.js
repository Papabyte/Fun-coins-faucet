"use strict";

var desktopApp = require('byteballcore/desktop_app.js');
var conf = require('byteballcore/conf.js');
var db = require('byteballcore/db.js');
var eventBus = require('byteballcore/event_bus.js');
var headlessWallet = require('headless-byteball');
var validationUtils = require("byteballcore/validation_utils.js");
var notifications = require('./notifications.js');
var wallet_id;

var arrPeers = [];

const coolDown = 24 * 3600 * 1000; //user is allowed to receive token again after this time

var assets = {
	'Tangos': {
		hash: '0Qki2BWSJ80dMN58Dq1rrJugaYyFndxkZloLJby+olU=',
		qty: 1100000,
		txtAmount: '1100000'
	},
	'Tingos': {
		hash: 'O1DbJWbZJfKhjZQYH5RrdRQ2ojMuo2WiaKbjIWSWd4E=',
		qty: 9900000,
		txtAmount: '9900000'
	},
	'Zingos': {
		hash: 'FPboi/y+Vo008aCHgPsEpSDQe1dogkKH0e1Z/iCcH84=',
		qty: 1200077,
		txtAmount: '12000.77'
	},
	'Zangos': {
		hash: 'O1DbJWbZJfKhjZQYH5RrdRQ2ojMuo2WiaKbjIWSWd4E=',
		qty: 9900099,
		txtAmount: '99000.99'
	},
	'Credits': {
		hash: 'o/VVwWXXGpb/XZ1fHh0m/SSgyNWydcYKPk6ScsJ4WRM=',
		qty: 1000,
		txtAmount: '1000'
	}
};

eventBus.on('headless_wallet_ready', function() {

	if (!conf.admin_email || !conf.from_email) {
		console.log("please specify admin_email and from_email in your " + desktopApp.getAppDataDir() + '/conf.json');
		process.exit(1);
	}

	
	headlessWallet.readSingleWallet(function(_wallet_id) {
		wallet_id = _wallet_id;
	});

	setInterval(function() {
			for (var index in arrPeers) {

				arrPeers[index].transactionsCount = 0;
				arrPeers[index].assetsSent = [];
			}

		},
		coolDown

	);
});


function prepareBalanceText(handleBalanceText) {
	var Wallet = require('byteballcore/wallet.js');
	Wallet.readBalance(wallet_id, function(assocBalances) {
		var arrLines = [];
		for (var asset in assocBalances) {
			var total = assocBalances[asset].stable + assocBalances[asset].pending;
			var units = (asset === 'base') ? ' bytes' : (' of ' + asset);
			var line = total + units;
			if (assocBalances[asset].pending)
				line += ' (' + assocBalances[asset].pending + ' pending)';
			arrLines.push(line);
		}
		handleBalanceText(arrLines.join("\n"));
	});
}

function processTxt(from_address, text) {
	var device = require('byteballcore/device.js');

	if (!arrPeers[from_address]) {
		arrPeers[from_address] = {};
		arrPeers[from_address].assetsSent = [];
	}

	if (text === 'balance') {
		prepareBalanceText(function(balances) {
			device.sendMessageToDevice(from_address, 'text', balances);
		});
	}

	if (text === 'cancel') {
		arrPeers[from_address].step = 'home';
	}
	if (assets[text] && arrPeers[from_address].assetsSent.indexOf(text) == -1) {

		if (Object.keys(assets).length > arrPeers[from_address].assetsSent.length) {
			arrPeers[from_address].assetToSend = text;
			arrPeers[from_address].step = 'giveAdress';
			device.sendMessageToDevice(from_address, 'text', 'Insert your address to receive ' + text + " (click on  '...'  bottom left)\n➡" + getTxtCommandButton("cancel"));

		} else {
			device.sendMessageToDevice(from_address, 'text', "Sorry you've already received enough tokens.");
		}

		return;
	}


	if (arrPeers[from_address].step == 'giveAdress') {
		if (validationUtils.isValidAddress(text.trim())) {
			headlessWallet.issueChangeAddressAndSendPayment(assets[arrPeers[from_address].assetToSend].hash, assets[arrPeers[from_address].assetToSend].qty, text.trim(), from_address, function() {
				arrPeers[from_address].step = 'yesNo';
				arrPeers[from_address].address = text.trim();
				arrPeers[from_address].assetsSent.push(arrPeers[from_address].assetToSend);
				notifications.notifyAdmin("Someone received " + arrPeers[from_address].assetToSend, from_address + " received " + arrPeers[from_address].assetToSend);

				if (Object.keys(assets).length > arrPeers[from_address].assetsSent.length) {
					device.sendMessageToDevice(from_address, 'text', 'Would you like to receive another token? \n➡ ' + getTxtCommandButton("yes") + ' \n➡ ' + getTxtCommandButton("no"));
					return;
				} else {
					sendThankYouMsg(from_address);
					arrPeers[from_address].step = 'home';
					return;
				}
			});


		} else {
			device.sendMessageToDevice(from_address, 'text', 'Incorrect address, try again \n➡' + getTxtCommandButton("cancel"));
			return;
		}
		return;
	}

	if (arrPeers[from_address].step == 'yesNo') {
		if (text.trim() == 'yes') {
			arrPeers[from_address].step = 'home';

		} else {
			sendThankYouMsg(from_address);
			arrPeers[from_address].step = 'home';
			return;
		}
	}


	var assetsList = '';

	if (Object.keys(assets).length > arrPeers[from_address].assetsSent.length) {

		for (var index in assets) {
			if (arrPeers[from_address].assetsSent.indexOf(index) == -1) {
				assetsList += getTxtCommandButton(assets[index].txtAmount + ' ' + index, index) + "\n";
			}
		}
		device.sendMessageToDevice(from_address, 'text', 'Tangos and Tingos are new tokens on the Byteball platform with zero monetary value, for your zero-risk practice with textcoin, smart contracts etc. Zangos and Zingos are like Tangos and Tingos but with decimal points. See http://byteball.wikia.com/wiki/Fun-coins for all details.\n\n Select the token you want to receive:\n' + assetsList);
	} else {

		device.sendMessageToDevice(from_address, 'text', "Sorry, you've already received enough tokens");

	}

}


function sendThankYouMsg(from_address) {

	var device = require('byteballcore/device.js');

	setTimeout(function() {
		device.sendMessageToDevice(from_address, 'text', 'Thank you very much. Now have fun playing with textcoins, smart contracts etc.');
	}, 300);

}


eventBus.on('paired', function(from_address) {

	processTxt(from_address, 'hi');

});



eventBus.on('text', function(from_address, text) {
	processTxt(from_address, text);

});



function getTxtCommandButton(label, command) {
	var text = "";
	var _command = command ? command : label;
	text += "[" + label + "]" + "(command:" + _command + ")";
	return text;
}