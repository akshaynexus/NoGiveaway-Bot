// const chalk = require('chalk');
const assert = require('assert');
const BLUtil = require('../helpers/blacklistcheck');
const TestConsts = require('./testconstants')
describe('Blacklist Tests:', function () {
        it('Bot impersonator check normal', function () {
            TestConsts.BotImperArr.forEach(ImperBot => {
                assert.equal(BLUtil.CheckBLBotImper(ImperBot),true);
            })
        });
       it('Bot impersonator check encoded', function () {
           TestConsts.BotImperArr.forEach(ImperBot => {
            assert.equal(BLUtil.CheckBLBotImper(encodeURI(ImperBot)),true);
           })
       });

       it('Bot impersonator check no-falsepositive', function () {
            TestConsts.NotBotArr.forEach(normUser => {
                assert.equal(BLUtil.CheckBLBotImper(normUser,false),false);
            })
       });

        it('Libra Spam check', function () {
            TestConsts.LibraFakeSpam.forEach(spamMsg => {
                assert.equal(BLUtil.isLibraSpam(spamMsg),true);
            })
            TestConsts.NotLibraSpam.forEach(normMsg => {
                assert.equal(BLUtil.isLibraSpam(normMsg),false);
            })
        });

        it('Fake BitMex check', function () {
            TestConsts.FakeBitmex.forEach(fakeBitmex => {
                assert.equal(BLUtil.isFakeBitmex(fakeBitmex),true);
            })
            TestConsts.NotFakeBitmex.forEach(normUser => {
                assert.equal(BLUtil.isFakeBitmex(normUser),false);
            })
        });

        it('Blacklisted ID check', function () {
            TestConsts.BlacklistedID.forEach(id => {
                assert.equal(BLUtil.checkIfIDIsBlacklised(id),true);
            })
            TestConsts.normalID.forEach(normid => {
                assert.equal(BLUtil.checkIfIDIsBlacklised(normid),false);
            })
        });

        it('Blacklisted Avatar check', function () {
            assert.equal(BLUtil.isBlacklistedAvatar(BLUtil.blacklistedavatars[1]),true);
            assert.equal(BLUtil.isBlacklistedAvatar("42693a500e622d60fae045cda2e5261f"),false);
            assert.equal(BLUtil.isBlacklistedAvatar("ec8768f48105c1219db7f05cfd7d6b84"),false);
        });
        it('Blacklisted Name check', function () {
            TestConsts.BLNames.forEach(BLName => {
                assert.equal(BLUtil.CheckBLMatch(BLName),true);
            })
            //Check that the blacklisted name isnt blacklisted if it is a bot
            assert.equal(BLUtil.CheckBLMatch(TestConsts.BLNames[0],null,true),false);
        });
        it('BanQueue check', function () {
            assert.equal(BLUtil.isBanQueueFinished(1,1),true);
            assert.equal(BLUtil.isBanQueueFinished(1,0),false);
        });
        it('Brand New Acc detection', function () {
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 1.44e+7,null),true);
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 1.08e+7,null),true);
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 2.592e+7,null),false);
            assert.equal(BLUtil.checkIfUserIsNew(Date.now() - 3.456e+8,null),false);
        });
});