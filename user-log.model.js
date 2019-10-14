const mongoose = require('mongoose');

const userExerciseLog = mongoose.Schema({
    username: { type: String, required: true },
    log: [
        {
            description: { type: String, required: true },
            duration: { type: Number, required: true },
            date: Date
        }
    ],
});

module.exports = mongoose.model('UserExerciseLog', userExerciseLog);
