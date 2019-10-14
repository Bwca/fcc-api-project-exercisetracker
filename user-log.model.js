const mongoose = require('mongoose');

const userExerciseLog = mongoose.Schema({
    username: { type: String, unique : true, required: true },
    log: [
        {
            description: { type: String, required: true, index: true },
            duration: { type: Number, required: true },
            date: Date
        }
    ],
});

module.exports = mongoose.model('UserExerciseLog', userExerciseLog);
