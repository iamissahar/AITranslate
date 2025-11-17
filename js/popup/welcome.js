document.addEventListener("DOMContentLoaded", function () {
  // Get all screenshot elements
  const screenshots = document.querySelectorAll(".screenshot");
  const modal = document.getElementById("screenshotModal");
  const modalImg = document.getElementById("modalImage");
  const closeBtn = document.getElementById("closeModal");

  // Add click event listeners to screenshots
  screenshots.forEach((screenshot) => {
    screenshot.addEventListener("click", function () {
      modal.style.display = "block";
      modalImg.src = this.src;
    });
  });

  // Close modal when close button is clicked
  closeBtn.addEventListener("click", function () {
    modal.style.display = "none";
  });

  // Close modal when clicking outside the image
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      modal.style.display = "none";
    }
  });
});
