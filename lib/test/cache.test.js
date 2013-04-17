(function() {

    var assert = require('assert')
    , expect = require('expect.js')
    , object = require('../object');

    describe('Checking cache functionality', function() {
        
        it('Checking set() method', function(done) {
            var result;
            var app = object.create();
            
            // Basic set
            app.set('verbose', true);
            result = app.get('verbose');
            expect(result).to.be.equal(true);
            
            // Get undefined key from instance cache
            result = app.get('snorkl');
            expect(result).to.be.equal(undefined);

            // Set/get additional key-value
            app = object.create({fish: 'cat'});
            result = app.get('fish');
            expect(result).to.be.equal('cat');
            
            // Change existing value for key
            app.set('fish','bird');
            result = app.get('fish');
            expect(result).to.be.equal('bird');
            
            // Set/get additional key-value
            app.set('verbose', true);
            result = app.get('verbose');
            expect(result).to.be.equal(true);
            
            // Nullify key
            app.set('verbose', null);
            result = app.get('verbose');
            expect(result).to.be.equal(null);
        
            // TODO How to test garbage gets collected?
            
            done();
        });
                
        it('Checking get() method', function(done) {
        
            var result;
            //var app = hoser.create({verbose: true});
            
            var app = object.create({verbose: true});
            
            // Basic get
            result = app.get('verbose');
            expect(result).to.be.equal(true);
            
            // Get undefined key from instance cache
            result = app.get('snorkl');
            expect(result).to.be.equal(undefined);
            
            // Create new hoser, passing options
            app = object.create({cat: 'dog'});
            result = app.get('cat');
            expect(result).to.be.equal('dog');
            
            // Get undefined key from instance cache
            result = app.get('verbose');
            expect(result).to.be.equal(undefined);
                    
            // Get own property instance
            result = app.get('get');
            expect(result).to.be.a('function');
        
            done();
        });
        
        it('Checking get() for chained path', function(done) {
        
            var result;
            var leaf = true;
            var shoot = {leaf: leaf};
            var twig = {shoot: shoot};
            var branch = {twig: twig};
            var sapling = {branch: branch};
            var app = object.create(sapling);
            
            // Basic get
            result = app.get('branch');
            expect(result).to.be.a('object');
            // 
            // Path get
            result = app.get('branch.twig');
            expect(result).to.be.a('object');
            result = app.get('branch.twig.shoot');
            expect(result).to.be.a('object');
            expect(result.leaf).to.be.equal(true);
            result = app.get('branch.twig.shoot.leaf');
            expect(result).to.be.equal(true);
            
            done();
        });
                
        it('Checking set() for chained path', function(done) {
        
            var result;
            var leaf = true;
            var shoot = {leaf: leaf};
            var twig = {shoot: {} };
            var branch = {twig: twig};
            var sapling = {branch: branch};
            var app = object.create();
            
            // Basic set
            app.set('branch', branch);
            result = app.get('branch');
            expect(result).to.be.a('object');
            
            // Path set (existing keys), follow up with get
            app.set('branch.twig.shoot', shoot);
            result = app.get('branch.twig');
            expect(result).to.be.a('object');
            result = app.get('branch.twig.shoot');
            expect(result).to.be.a('object');
            expect(result.leaf).to.be.equal(true);
            result = app.get('branch.twig.shoot.leaf');
            expect(result).to.be.equal(true);
            
            // Path set (non-existent keys), follow up with get
            result = app.get('branch.leg');
            expect(result).to.be.equal(undefined);
            app.set('branch.leg', {});
            result = app.get('branch.leg');
            expect(result).to.be.a('object');

            // Should not set more than one key/value descendent
            //  ... i.e. there is no "foot" onto which a "toe" can be added
            //  NOTE: Need to pass expect() a function, so need to wrap a function call
            //      in a function with the appropriate test values as an argument to
            //      the wrapper.  This way, we can pass func.call(blah, blah) into the test
            var func = function(app) {
                this.app = arguments[0];
                return function() {
                    app.set('branch.leg.foot.toe', 'blammo');;
                }
            }
            expect(func.call(app, app)).to.throwException(/Object in path branch\.leg\.foot could not be found or was destroyed/);
            
            // ... also should not ignore the "foot" parent in the chain
            result = app.get('branch.leg.toe');
            expect(result).to.be.equal(undefined);
            
            // Should create a "foot" key on "leg"
            app.set('branch.leg.foot', {});
            result = app.get('branch.leg.foot');
            expect(result).to.be.a('object');
            
            // Should set a "toe" key on "foot"
            app.set('branch.leg.foot.toe', 'blammo')
            result = app.get('branch.leg.foot.toe');
            expect(result).to.be.equal('blammo');
            
            // TODO Make hoser be able to return contextualized objects
            //      result = app.get('branch').get('leg');
            // ... should return the same as app.get('branch.leg');
            
            done();
        });
        
    });

}).call(this);