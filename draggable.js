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
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    }
  
    disconnectedCallback() {
      this.removeEventListener('mousedown', this.onMouseDown);
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
    
    onMouseDown(e) {
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label'];
      const isNotDraggable = e.target.isNotDraggable || false;
      const isInteractive = e.target.closest(interactiveTags.join(','));
    
      // Prevent dragging if the element is interactive or explicitly marked non-draggable
      if (isInteractive || isNotDraggable || e.target.closest('[draggable="true"]')) return;
    
      this.isDragging = true;
    
      // Use getBoundingClientRect for zoom-safe offset calculation
      const rect = this.getBoundingClientRect();
      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
    
      this.style.position = 'absolute'; // ensure draggable
      this.style.zIndex = 1000;
      e.stopPropagation();
    }
    
    onMouseMove(e) {
      if (this.isDragging) {
        this.style.left = `${e.clientX - this.offsetX}px`;
        this.style.top = `${e.clientY - this.offsetY}px`;
      }
    }
    
    onMouseUp() {
      this.isDragging = false;
    }
}
customElements.define('draggable-element', Draggable);
  