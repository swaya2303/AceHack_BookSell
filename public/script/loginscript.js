// let signup = document.querySelector(".signup");
// let login = document.querySelector(".login");
// let slider = document.querySelector(".slider");
// let formSection = document.querySelector(".form-section");

// signup.addEventListener("click", () => {
//     slider.classList.add("moveslider");
//     formSection.classList.add("form-section-move");
// });

// login.addEventListener("click", () => {
//     slider.classList.remove("moveslider");
//     formSection.classList.remove("form-section-move");
// });

// document.querySelector(".login-box").addEventListener("submit", async function (event) {
//       event.preventDefault(); // Prevent default form submission
    
//       const formData = new FormData(this);
//       const phone_email = formData.get("phone_email");
//       const password = formData.get("password");
    
//       try {
//         const response = await fetch("/login-signup/login", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ phone_email, password }),
//         });
    
//         const data = await response.json();
    
//         if (response.ok && data.success) {
//           sessionStorage.setItem("userId", data.userId); // Store userId in sessionStorage
//           window.location.href = "/index.html"; // ✅ Redirect after successful login
//         } else {
//           alert("Login failed: " + data.message); // Show error message
//         }
//       } catch (error) {
//         console.error("Error during login:", error);
//         alert("An error occurred. Please try again.");
//       }
//     });
//       document.addEventListener("DOMContentLoaded", function () {
//     const passwordFields = document.querySelectorAll("input[type='password']");
//     const toggleIcons = document.querySelectorAll("[data-kt-password-meter-control='visibility']");

//     toggleIcons.forEach((icon, index) => {
//         icon.addEventListener("click", function () {
//             const input = passwordFields[index];
//             if (input.type === "password") {
//                 input.type = "text";
//                 icon.innerHTML = '<i class="bi bi-eye"></i>';
//             } else {
//                 input.type = "password";
//                 icon.innerHTML = '<i class="bi bi-eye-slash"></i>';
//             }
//         });
//     });

//     document.querySelector('.login-box').addEventListener("submit", function (event) {
//         event.preventDefault();
//         const form = this;
//         form.style.opacity = "0.5";
//         setTimeout(() => {
//             form.style.opacity = "1";
//         }, 500);
//     });
// });
let signup = document.querySelector(".signup");
let login = document.querySelector(".login");
let slider = document.querySelector(".slider");
let formSection = document.querySelector(".form-section");

// Slider functionality
signup.addEventListener("click", () => {
    slider.classList.add("moveslider");
    formSection.classList.add("form-section-move");
});

login.addEventListener("click", () => {
    slider.classList.remove("moveslider");
    formSection.classList.remove("form-section-move");
});

// Login form submission
document.querySelector(".login-box").addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    const phone_email = formData.get("phone_email").trim(); // Trim to avoid whitespace issues
    const password = formData.get("password");

    try {
        const response = await fetch("/login-signup/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone_email, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            sessionStorage.setItem("userId", data.userId);
            window.location.href = "/index.html";
        } else {
            alert("Login failed: " + (data.message || "Unknown error"));
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login. Please try again.");
    }
});

// Signup form submission
document.querySelector(".signup-box").addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    const phone_email = formData.get("phone_email").trim();
    const name = formData.get("name");
    const password = formData.get("password");
    const confirm_password = formData.get("confirm_password");

    if (password !== confirm_password) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch("/login-signup/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone_email, password }),
        });

        if (response.ok) {
            alert("Signup successful! Please log in.");
            slider.classList.remove("moveslider");
            formSection.classList.remove("form-section-move");
        } else {
            const data = await response.text();
            alert("Signup failed: " + data);
        }
    } catch (error) {
        console.error("Signup error:", error);
        alert("An error occurred during signup. Please try again.");
    }
});