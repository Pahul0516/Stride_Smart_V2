// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAg-t3_BybcThELb040GCDGP_vmvDNGy-Y",
  authDomain: "walksafe-f1875.firebaseapp.com",
  projectId: "walksafe-f1875",
  storageBucket: "walksafe-f1875.firebasestorage.app",
  messagingSenderId: "928449334256",
  appId: "1:928449334256:web:06b0635195153589c7ab35",
  measurementId: "G-NH195P9E3C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const provider= new GoogleAuthProvider();
const auth=getAuth(app);
auth.languageCode='en';

async function googleLogin(userName,email)
{
    const requestData={ userName, email };
    console.log('resuqest data: ',requestData);
    try {
        const response = await fetch("http://127.0.0.1:5001/googleLogin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (response.ok) {
            alert("Logged in successfully!");
            console.log("Server Response:", result);
            setSessionDetails(result);
            window.location.href = "http://127.0.0.1:5001/map";

        } else {
            alert("Registration failed: " + (result.message || "Unknown error"));
        }
    } catch (error) {
        console.error("Error during registration:", error);
        alert("An error occurred. Please try again later.");
    }

}

//function for setting user data before switching pages
async function setSessionDetails(result)
{
    sessionStorage.setItem("account_id", result[0]);
    sessionStorage.setItem("username", result[1]);
    sessionStorage.setItem("email",result[2]);
    sessionStorage.setItem("points", result[6]);
}

export async function logOut()
{
    sessionStorage.removeItem("account_id");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("points");
    window.location.href = "http://127.0.0.1:5001/login";
}

document.addEventListener("DOMContentLoaded", () => {
    const loginButton = document.getElementById("loginButton");

    if (!loginButton) {
        console.error("Login button not found!");
        return;
    }

    loginButton.addEventListener("click", async (event) => {
        event.preventDefault(); // Prevent form submission if inside a <form>
        // Get input values
        console.log('login button pressed');
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // Simple validation
        if (!email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        // Create request body
        const requestData = { email, password };

        try {
            const response = await fetch("http://127.0.0.1:5001/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            const result = await response.json();
            console.log("Server Response:", result);

            if (response.ok) {
                alert("Logged in successfully!");
                //keep data about logged in user
                setSessionDetails(result);
                window.location.href = "http://127.0.0.1:5001/map";
            } else {
                alert("Registration failed: " + (result));
            }
        } catch (error) {
            console.error("Error during registration:", error);
            alert("An error occurred. Please try again later.");
        }

    });

    const googleLoginButton = document.getElementById("googleLoginButton");

    googleLoginButton.addEventListener("click", async (event) => {
        console.log('google button pressed');
        signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            // IdP data available using getAdditionalUserInfo(result)
            googleLogin(user.displayName,user.email);

        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            
        });

    });

});
