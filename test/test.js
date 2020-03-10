// const chalk = require('chalk');
const assert = require('assert');
const BLUtil = require('../helpers/blacklistcheck');
const DBUtil = require('../helpers/dbhelper');
const TestConsts = require('./testconstants')
describe('NoGiveway testing', function () {
        it('Bot impersonator check normal', function () {
            for(var i=0;i<TestConsts.BotImperArr.length;i++){
                assert.equal(BLUtil.CheckBLBotImper(TestConsts.BotImperArr[i]),true);
            }
        });
       it('Bot impersonator check encoded', function () {
            for(var i=0;i<TestConsts.BotImperArr.length;i++){
                assert.equal(BLUtil.CheckBLBotImper(encodeURI(TestConsts.BotImperArr[i])),true);
            }
       });

       it('Bot impersonator check no-falsepositive', function () {
            for(var i=0;i<TestConsts.NotBotArr.length;i++){
                assert.equal(BLUtil.CheckBLBotImper(TestConsts.NotBotArr[i],true),false);
            }
       });

        it('Libra Spam check', function () {
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in facebooks libra coin, it just got released. Heres the website https://librasecure.net/ and the tweet https://imgur.com/H8MZuk"),true);
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in facebooks ⅼⅰbra currency, it just got released, means you can buy some cheap at the moment"),true);
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in facebooks libra coin, it just got released. Heres the website https://librasecure.net/ and the tweet https://imgur.com/H8MZuke"),true);
            assert.equal(BLUtil.isLibraSpam("facebook has released some new info regarding libra"),false);
        });

        it('Fake BitMex check', function () {
            assert.equal(BLUtil.isFakeBitmex("Bitmex Giveaway"),true);
            assert.equal(BLUtil.isFakeBitmex("Bitmex [News]"),true);
            assert.equal(BLUtil.isFakeBitmex("e"),false);
        });

        it('Blacklisted ID check', function () {
            assert.equal(BLUtil.checkIfIDIsBlacklised(665326064406626300),true);
            assert.equal(BLUtil.checkIfIDIsBlacklised(670673938648662100),true);
            assert.equal(BLUtil.checkIfIDIsBlacklised(12312312313),false);
        });

        it('Blacklisted Avatar check', function () {
            assert.equal(BLUtil.isBlacklistedAvatar(BLUtil.blacklistedavatars[1]),true);
            assert.equal(BLUtil.isBlacklistedAvatar("42693a500e622d60fae045cda2e5261f"),false);
            assert.equal(BLUtil.isBlacklistedAvatar("ec8768f48105c1219db7f05cfd7d6b84"),false);
        });
        it('Blacklisted Name check', function () {
            for(var i=0;i<TestConsts.BLNames.length;i++){
                assert.equal(BLUtil.CheckBLMatch(TestConsts.BLNames[i],null,false),true);
            }
        });
        it('Blacklisted Name No-Falsepositive bot', function () {
                assert.equal(BLUtil.CheckBLMatch(TestConsts.BLNames[0],null,true),false);
        });
//     it('DB User Check', function () {
// //        assert.equal(await DBUtil.connectDB(),true);
//         assert.notEqual( DBUtil.findGuild(669666075771797500),null);
//         // assert.equal( DBUtil.findGuild(234000238262747138),null);
//         // assert.equal( DBUtil.findGuild(417857235079790592),null);
//     });
});