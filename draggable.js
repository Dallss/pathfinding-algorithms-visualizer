class Draggable extends HTMLElement {
    constructor() {
      super();
      // Instance variables
      this.isDragging = false;
      this.offsetX = 0;
      this.offsetY = 0;
  
      // Event bindings
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
    }
  
    connectedCallback() {
      // Basic styles
      this.style.width = 'fit-content';
      this.style.height = 'fit-content';
      this.style.padding = '2px';
      this.style.position = 'absolute'; 
        
      this.addEventListener('mousedown', this.onMouseDown);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
    }
  
    disconnectedCallback() {
      this.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
    }
    
    onMouseDown(e) {
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label'];
      const isNotDraggable = e.target.isNotDraggable || false;
      const isInteractive = e.target.closest(interactiveTags.join(','));
      const isCell = e.target.classList && e.target.classList.contains('cell');
    
      // Prevent dragging if the element is interactive, a cell, or explicitly marked non-draggable
      if (isInteractive || isNotDraggable || isCell || e.target.closest('[draggable="true"]')) return;
    
      this.isDragging = true;
    
      // Use getBoundingClientRect for zoom-safe offset calculation
      const rect = e.currentTarget.getBoundingClientRect();
      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
    
      this.style.position = 'absolute'; // ensure draggable
      this.style.zIndex = 1000;
    }
    
    onMouseMove(e) {
      if (this.isDragging) {
        this.style.left = `${500}px`;
        this.style.top = `${500}px`;
      }
    }
    
    
    onMouseUp() {
      this.isDragging = false;
    }
}
customElements.define('draggable-element', Draggable);
  