//function for setting user data before going into about page
async function setSessionDetails(result)
{
    sessionStorage.setItem("account_id", result[0]);
    sessionStorage.setItem("username", result[1]);
    sessionStorage.setItem("email",result[2]);
    sessionStorage.setItem("points", result[6]);
}

document.addEventListener("DOMContentLoaded", () => {
    const createAccountButton = document.getElementById("createAccountButton");

    createAccountButton.addEventListener("click", async (event) => {
        event.preventDefault(); // Prevent form submission if inside a <form>
        // Get input values
        const userName = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        // Simple validation
        if (!userName || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        // Create request body
        const requestData = { userName, email, password };
        console.log('request data: ',requestData);

        try {
            const response = await fetch("http://127.0.0.1:5001/createAccount", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            const result = await response.json();
            
            if (response.ok) {
                alert("Account created successfully!");
                console.log("Server Response:", result);
                
                setSessionDetails(result);
                window.Location.href="http://127.0.0.1:5001/map";
            } else {
                alert("Registration failed: " + (result));
            }
        } catch (error) {
            console.error("Error during registration:", error);
            alert("An error occurred. Please try again later.");
        }
       
    });
});
