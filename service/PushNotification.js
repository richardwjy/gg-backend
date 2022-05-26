const admin = require('firebase-admin');
// let serviceAccount = require('../key/gg-push-notif-firebase-adminsdk-1nguv-4a2adab86c.json');
const serviceAccount = require('../key/access-token.json');

// admin.initializeApp({
//     apiKey: "AIzaSyAZZzeBb1Vkb54NY6oadXe-sjOIvZkiFKI",
//     authDomain: "gg-pushnotif.firebaseapp.com",
//     projectId: "gg-pushnotif",
//     storageBucket: "gg-pushnotif.appspot.com",
//     messagingSenderId: "106427256207",
//     appId: "1:106427256207:web:eb001cc957b01d78760ffa"
// });

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
};

module.exports.sendNotification = (registrationToken = "c32Na2MAQX-AB0OCNxrFvO:APA91bFYLa1FhF6cnlAGEbF3NcJg4uEDFbj6v6abHEVSh5Gtfj6MZ5oLa3L2CjYxl5JfdCcy9bmQ4tO8PIy6QxiNrVIGs6xZ1LqU7R3GKsyQUpgjAdsR0KUSuVKEZI-K9DnP-EJZjiw4", message) => {
    console.log(registrationToken);
    return new Promise((resolve, reject) => {
        admin.messaging().sendToDevice(registrationToken, message, options).then((response) => {
            console.log(response);
            resolve(response);
        }).catch((error) => {
            console.log(error)
            reject(error);
        })
    })
}


// const FCM = require('fcm-node');
// const serverKey = "AAAApF0LlCs:APA91bFa1njD0AQbCEp87AbT4080PX81TIfVQ5Y9VL7Sqjdy2KhF2Bqx1rTJz4ilQM66sPN6pdiPCF4H_2wqt8g_VSGIzkj7G7-K9k3AdeOLiNt4N3IAk6W7hYiW3KLHmchwX-k7wSqK";
// const fcm = new FCM(serverKey);

// module.exports.sendNotification = (message) => {
//     return new Promise((resolve, reject) => {
//         fcm.send(message, (err, response) => {
//             if (err) {
//                 console.log("Something has gone wrong!");
//                 reject(err);
//             } else {
//                 console.log("Successfully sent with response: ", response);
//                 resolve(response);
//             }
//         })
//     })
// }

