// const chalk = require('chalk');
const assert = require('assert');
const BLUtil = require('../helpers/blacklistcheck');
const TestConsts = require('./testconstants')
describe('Blacklist Tests:', function () {
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
                assert.equal(BLUtil.CheckBLBotImper(TestConsts.NotBotArr[i],false),false);
            }
       });

        it('Libra Spam check', function () {
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in facebooks libra coin, it just got released. Heres the website https://librasecure.net/ and the tweet https://imgur.com/H8MZuk"),true);
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in facebooks ⅼⅰbra currency, it just got released, means you can buy some cheap at the moment"),true);
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in facebooks libra coin, it just got released. Heres the website https://librasecure.net/ and the tweet https://imgur.com/H8MZuke"),true);
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in fаcebooks ⅼⅰbra currency, it just got released, means you can buy some at the moment. Heres the website: ⅼⅰbrasecure.net and the tweet: imgur.ⅽom/zHnd8eh (there are doing a sale currently where you can get them cheaper, but its almost over)"),true);
            assert.equal(BLUtil.isLibraSpam("for the ones who are interested in fаcebooks ⅼⅰbra currency, it just got released, means you can buy some at the moment. Heres the website: ⅼⅰbrasecure.net and the tweet: imgur.ⅽom/zHnd8eh (there are doing a sale currently where you can get them cheaper, but its almost over) Btw thanks to this i was 'able' to survive this crash xD"),true);
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
        it('BanQueue check', function () {
            assert.equal(BLUtil.isBanQueueFinished(1,1),true);
            assert.equal(BLUtil.isBanQueueFinished(1,0),false);
        });
        it('Brand New Acc detection', function () {
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 1.296e+8,null),true);
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 8.64e+7,null),true);
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 2.592e+7,null),true);
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 3.456e+8,null),false);
        });
});