var testClass = {
    name: 'testname',
    get_name: function() {
        return this.name;
    },
    set_name: function(name) {
        this.name = name;
    }
}

var i = Object.create(testClass);
console.log(i.get_name());
console.log(i.set_name('james'));
console.log(i.get_name());
