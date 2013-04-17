(function() {

    var assert = require('assert')
    , expect = require('expect.js')
    , object = require('../object')
    , metal = require('../metal');

    describe('Checking object functionality', function() {
        
        // it('Check basic object creation', function(done) {
        //     var result;
        //     
        //     var testObject = object.create({
        //         init: function() { }
        //         , test: function() {
        //             var test = this.__super();
        //             return [test, true];
        //         }
        //     });
        //     
        //     result = testObject.test();
        //     expect(result[0]).to.be.equal(true);
        //     expect(result[1]).to.be.equal(true);
        //     
        //     done();
        // });
        
        it('Check extending object, then create', function(done) {
            var result;

            var TestExtendedObject = object.extend({
                init: function() { }
                , test: function() {
                    var test = this._super();
                    return [test, 'true'];
                }
            }, {
                foo: 'bar'
                , baz: 'bof'
            });
            //         
            var testExtendedObject = TestExtendedObject.create();
            result = testExtendedObject.test();
            expect(result[0]).to.be.equal(true);
            expect(result[1]).to.be.equal('true');
            expect(testExtendedObject.foo).to.be.equal('bar');
            expect(testExtendedObject.baz).to.be.equal('bof');

            var TestAnotherExtendedObject = object.extend({
                test: function() {
                    var test = this._super();
                    return [test, 'false'];
                }
                , create: function() { console.log('doing the wrong thing'); }
                , foo: 'biz'
                , baz: 'boz'
            })
            // for(var n in TestAnotherExtendedObject) {
            //     console.log(n + ' | ' + TestAnotherExtendedObject[n]);
            //     console.log(metal.meta(TestAnotherExtendedObject))
            // }
            for(var n in TestAnotherExtendedObject) {
                //console.log(n);

                // if(TestAnotherExtendedObject[n]) {
                //     console.log(n + ' | ' + TestAnotherExtendedObject[n].toString());
                // } else {
                //     console.log(n + " | is " + n)
                // }
            }
            for(var n in TestExtendedObject) {
                //console.log(n);

                // if(TestAnotherExtendedObject[n]) {
                //     console.log(n + ' | ' + TestAnotherExtendedObject[n].toString());
                // } else {
                //     console.log(n + " | is " + n)
                // }
            }
            var testAnotherExtendedObject = [];
            //console.log('----- begin ------');
            
            for (var i = 0; i < 4; i++) {
                testAnotherExtendedObject[i] = TestAnotherExtendedObject.create();
                result = testAnotherExtendedObject[i].test();
                expect(result[0]).to.be.equal(true);
                expect(result[1]).to.be.equal('false');
                expect(testAnotherExtendedObject[i].foo).to.be.equal('biz');
                expect(testAnotherExtendedObject[i].baz).to.be.equal('boz');
            }
            testAnotherExtendedObject = TestAnotherExtendedObject.create();
            //console.log()
            
            // Retest the first object that got created to ensure that no variable poisining occurred
            result = testExtendedObject.test();
            expect(result[0]).to.be.equal(true);
            expect(result[1]).to.be.equal('true');
            expect(testExtendedObject.foo).to.be.equal('bar');
            expect(testExtendedObject.baz).to.be.equal('bof');
            
            done();
        });
        
                
        it('Check extending object, then create with overrides', function(done) {
            var result;
            
            var TestExtendedObject = object.extend({
                init: function() { }
                , test: function() {
                    var test = this._super();
                    return [test, true];
                }
            });
            
            var TestExtendedObject2 = TestExtendedObject.extend({
                kablam: function() {
                    return 'blammo!'
                }
            });
        
            var testExtendedObject = TestExtendedObject2.create({
                test: function() {
                    // metal.create does not support defining methods that call _super
                    return 'overridden';
                }
                , foo: function(str, salt) {
                    return str+salt;
                }
                , bar: 'Bar of the Foo'
            },
            {
                // Override the previous mixin's bar property
                bar: 'Foo of the Bar'
            });
            result = testExtendedObject.test();
            expect(result).to.be.equal('overridden');
            result = testExtendedObject.foo('now','here');
            expect(result).to.be.equal('nowhere');
            expect(testExtendedObject.bar).to.be.equal('Foo of the Bar');
            expect(testExtendedObject.kablam).to.be.a('function');
            expect(testExtendedObject.kablam()).to.be.equal('blammo!');
            // 
            // for(var n in testExtendedObject) {
            //     //console.log(n);
            // 
            //     if(testExtendedObject[n]) {
            //         console.log(n + ' | ' + testExtendedObject[n].toString());
            //     } else {
            //         console.log(n + " | is " + n)
            //     }
            // }
            // Accessor test
            expect(testExtendedObject.get('bar')).to.be.equal('Foo of the Bar');
            
            testExtendedObject.set('bar', 'Fiz of the Baz');
            
            expect(testExtendedObject.get('bar')).to.be.equal('Fiz of the Baz');
            
            testExtendedObject.set('biz', { fuzz: 'Fuzz of the Foos' });
            
            expect(testExtendedObject.get('biz.fuzz')).to.be.equal('Fuzz of the Foos');
            
            testExtendedObject.set('biz.fuzz', 'Foos of the Fuzz' );
            
            expect(testExtendedObject.get('biz.fuzz')).to.be.equal('Foos of the Fuzz');
            
            
            
            done();
        });
        
    });

}).call(this);