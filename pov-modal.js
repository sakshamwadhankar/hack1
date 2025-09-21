/* pov-modal.js — POV Video Modal functionality */
/* global */

(function () {
  // Wait for DOM to be ready
  function initPOVModal() {
    const povBtn = document.getElementById('btn-pov');
    const povModal = document.getElementById('pov-modal');
    const povCloseBtn = document.getElementById('pov-close');
    const povVideo = document.getElementById('pov-video');
    
    if (!povBtn || !povModal || !povCloseBtn || !povVideo) {
      console.error('POV modal elements not found');
      return;
    }
    
    // Open modal
    povBtn.addEventListener('click', () => {
      console.log('POV button clicked');
      povModal.hidden = false;
      
      // Pause video when modal opens (in case it was playing)
      if (povVideo.contentWindow) {
        povVideo.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    });
    
    // Close modal
    function closePOVModal() {
      povModal.hidden = true;
      
      // Pause video when modal closes
      if (povVideo.contentWindow) {
        povVideo.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    }
    
    povCloseBtn.addEventListener('click', closePOVModal);
    
    // Close on ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !povModal.hidden) {
        closePOVModal();
      }
    });
    
    // Close on backdrop click
    povModal.addEventListener('click', (e) => {
      if (e.target === povModal) {
        closePOVModal();
      }
    });
    
    // Handle video events
    povVideo.addEventListener('load', () => {
      console.log('POV video loaded');
    });
    
    console.log('POV modal functionality initialized');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPOVModal);
  } else {
    initPOVModal();
  }
})();

