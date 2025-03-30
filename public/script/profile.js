document.addEventListener("DOMContentLoaded", () => {
  // Fetch and display profile details
  fetch("/profile", { credentials: "include" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch profile data.");
      }
      return response.json();
    })
    .then((data) => {
      if (data) {
        document.getElementById("name").value = data.name || "";
        document.getElementById("phone").value = data.phone || "";
        document.getElementById("address").value = data.address || "";
        document.getElementById("email").value;
      }
    })
    .catch((error) => {
      console.error("Error fetching profile:", error);
      document.querySelector(".main-content").innerHTML = `<p class="text-danger">Error loading profile data.</p>`;
    });

  // Tab switching functionality
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      this.classList.add("active");
      const tabId = this.getAttribute("data-tab");
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });

  // Profile form submission
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
      };

      fetch("/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to update profile.");
          }
          return response.text();
        })
        .then((message) => {
          console.log("Server response:", message);
          showNotification("Profile updated successfully!", "success");
        })
        .catch((error) => {
          console.error("Error updating profile:", error);
          showNotification("An error occurred while updating your profile.", "error");
        });
    });
  }

  // Password form submission (not implemented in backend yet)
  const passwordForm = document.getElementById("password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("current-password").value;
      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (newPassword !== confirmPassword) {
        showNotification("New passwords do not match!", "error");
        return;
      }

      // Placeholder for password update logic (add backend route if needed)
      console.log("Password update requested:", { currentPassword, newPassword });
      showNotification("Password update not implemented yet!", "info");
      passwordForm.reset();
    });
  }

  // Mobile menu toggle for sidebar
  const createMobileMenuToggle = () => {
    const sidebar = document.querySelector(".sidebar");
    if (window.innerWidth < 992 && !document.querySelector(".mobile-menu-toggle")) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "mobile-menu-toggle";
      toggleBtn.innerHTML = '<i class="bi bi-list"></i> Menu';
      sidebar.parentNode.insertBefore(toggleBtn, sidebar);

      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        toggleBtn.classList.toggle("active");
      });

      const style = document.createElement("style");
      style.textContent = `
        .mobile-menu-toggle {
          display: block;
          width: 100%;
          padding: 12px;
          background-color: var(--primary);
          color: var(--white);
          border: none;
          text-align: left;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 15px;
          border-radius: 4px;
        }
        .mobile-menu-toggle i { margin-right: 8px; }
        .mobile-menu-toggle.active { background-color: var(--secondary); color: var(--primary); }
        @media (max-width: 991px) { .sidebar:not(.active) { display: none; } }
        @media (min-width: 992px) { .mobile-menu-toggle { display: none; } }
      `;
      document.head.appendChild(style);
    }
  };

  createMobileMenuToggle();
  window.addEventListener("resize", createMobileMenuToggle);

  // Notification function
  function showNotification(message, type = "info") {
    let notification = document.querySelector(".notification");
    if (!notification) {
      notification = document.createElement("div");
      notification.className = "notification";
      document.body.appendChild(notification);

      const style = document.createElement("style");
      style.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 25px;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          z-index: 1000;
          transform: translateY(-100px);
          opacity: 0;
          transition: all 0.3s ease;
        }
        .notification.show { transform: translateY(0); opacity: 1; }
        .notification.success { background-color: #4CAF50; }
        .notification.error { background-color: #F44336; }
        .notification.info { background-color: var(--primary); }
      `;
      document.head.appendChild(style);
    }

    notification.textContent = message;
    notification.className = `notification ${type}`;
    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => notification.classList.remove("show"), 3000);
  }
});