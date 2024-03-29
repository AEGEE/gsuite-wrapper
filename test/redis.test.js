const chai = require('chai');

const should = chai.should();
const { startServer, stopServer } = require('../lib/server');

const redis = require('../lib/redis');

// function delay(interval) {
//     return it('should delay', (done) => { setTimeout(() => done(), interval); },).timeout(interval + 100); // The extra 100ms should guarantee the test will not fail due to exceeded timeout
// }

// GLOBAL!
before('start server', async () => {
    const result = await startServer();
    console.log(result);
});

// GLOBAL!
after('stop server', async () => {
    const result = await stopServer();
    console.log(result);
});

describe.skip('Redis', () => {
    const Redis = redis.db;

    //    it('should just do fuckign something', function(done){
    //      Redis.set("ciao","bambina");
    //      done();
    //    });

    it('should list keyspace', (done) => {
    // redis.get("ciao").then(res => {console.log(res); done();}) ;
        Redis.keys('*').then((res) => { console.log(res); done(); });
    });

    //    it('should just do another something', function(done){
    //        //redis.get("ciao").then(res => {console.log(res); done();}) ;
    //        Redis.get("ciao").then(res => {console.log(res); done()});
    //    });

    it.skip('should FLUSH DB OMH', (done) => {
    // redis.get("ciao").then(res => {console.log(res); done();}) ;
        Redis.flushdb().then((res) => { console.log(res); done(); });
    });
});
