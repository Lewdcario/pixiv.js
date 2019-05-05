const settings = require('./config');
const Pixiv = require('./index');
const assert = require('assert');

describe('Pixiv', function () {
	describe('#username', function (){
		it('Should be the same as the passed in username', function () {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			assert.strictEqual(pixiv.username, settings.username);
		});

		it('Should error if not passed', function () {
			const causeError = () => new Pixiv(undefined, settings.password, settings.clientID, settings.clientSecret);
			assert.throws(causeError);
		});
	});

	describe('#password', function () {
		it('Should be the same as the passed in password', function () {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			assert.strictEqual(pixiv.password, settings.password);
		});

		it('Should error if not passed', function () {
			const causeError = () => new Pixiv(settings.username, undefined, settings.clientID, settings.clientSecret);
			assert.throws(causeError);
		});
	});

	describe('#clientID', function () {
		it('Should be the same as the passed in clientID', () => {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			assert.strictEqual(pixiv.clientID, settings.clientID);
		});

		it('Should error if not passed', function () {
			const causeError = () => new Pixiv(settings.username, settings.password, undefined, settings.clientSecret);
			assert.throws(causeError);
		});
	});

	describe('#clientSecret', function () {
		it('Should be the same as the passed in clientSecret', () => {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			assert.strictEqual(pixiv.clientSecret, settings.clientSecret);
		});

		it('Should error if not passed', function () {
			const causeError = () => new Pixiv(settings.username, settings.password, settings.clientID, undefined);
			assert.throws(causeError);
		});
	});

	describe('#illustDetail', function () {
		this.timeout(5000);

		it('Should return an object', async function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			const info = await pixiv.illustDetail(66792759);
			assert(typeof info === 'object');
			done();
		});

		it('Should error if not provided an id', function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			return assert.rejects(pixiv.illustDetail.bind(pixiv, undefined));
		});
	});

	describe('#getImageByKeyword', function() {
		this.timeout(5000);

		it('Should return a string', async function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			const url = await pixiv.getImageByKeyword('sonic');
			assert(url.constructor.name === 'String');
			done();
		});

		it('Should return a pixiv URL', async function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			const url = await pixiv.getImageByKeyword('sonic');
			assert(/i\.pximg\.net/.test(url));
			done();
		});

		it('Should error if not provided a keyword', function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			return assert.rejects(pixiv.getImageByKeyword.bind(pixiv, undefined));
		});
	});

	describe('#downloadFromIllustURL', function() {
		this.timeout(5000);

		it('Should return a buffer', function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			return pixiv.downloadFromIllustURL('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=66792759')
				.then(buffer => assert(Buffer.isBuffer(buffer)));
		});

		it('Should error if not provided a URL', function done() {
			const pixiv = new Pixiv(settings.username, settings.password, settings.clientID, settings.clientSecret);
			return assert.rejects(pixiv.downloadFromIllustURL.bind(pixiv, undefined));
		});
	})
});
