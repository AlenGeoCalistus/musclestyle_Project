const mongoClient = require('mongodb').MongoClient;

//intital db state null
const state = {
    db: null
}

module.exports.connect = function (done) {
    const url = 'mongodb://localhost:27017'
    const dbname = 'fitness'

    mongoClient.connect(url, (err, data) => {
        if (err) {
            return done(err)
        } else {
            state.db = data.db(dbname)
            done()

        }

    })
    module.exports.get = () => {
        return state.db

    }
}

