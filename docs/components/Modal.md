# Modal Component

A flexible, accessible modal dialog component for displaying content in an overlay that requires user interaction before proceeding.

### Purpose & Overview

The Modal component creates a dialog overlay that:
- Focuses user attention on specific content or actions
- Blocks interaction with the underlying page
- Provides a consistent way to display forms, confirmations, and detailed information
- Ensures proper accessibility with focus management and keyboard navigation

**When to use:**
- Confirmation dialogs
- Forms that require focused attention
- Detailed information that doesn't warrant a new page
- Image galleries or media viewers

**When NOT to use:**
- Simple notifications (use Toast instead)
- Navigation menus (use Dropdown instead)
- Persistent UI elements (use Sidebar instead)

### API Reference

#### Props/Parameters

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `isOpen` | `boolean` | `false` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | `undefined` | ✅ | Function called when modal should close |
| `title` | `string` | `undefined` | ❌ | Modal title displayed in header |
| `children` | `ReactNode` | `undefined` | ✅ | Modal content |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | ❌ | Modal size |
| `closeOnOverlayClick` | `boolean` | `true` | ❌ | Allow closing by clicking overlay |
| `closeOnEscape` | `boolean` | `true` | ❌ | Allow closing with Escape key |
| `showCloseButton` | `boolean` | `true` | ❌ | Show X button in header |
| `preventScroll` | `boolean` | `true` | ❌ | Prevent body scroll when open |
| `className` | `string` | `undefined` | ❌ | Additional CSS classes for modal content |
| `overlayClassName` | `string` | `undefined` | ❌ | Additional CSS classes for overlay |

#### Sizes

- `size="sm"` - 400px max width, compact content
- `size="md"` - 600px max width, standard dialogs
- `size="lg"` - 800px max width, detailed forms
- `size="xl"` - 1000px max width, complex content
- `size="full"` - Full screen modal

#### States

- **Closed**: Not visible, no DOM impact
- **Opening**: Fade-in animation with scale transform
- **Open**: Fully visible with focus trapped
- **Closing**: Fade-out animation
- **Loading**: Optional loading state for async content

### Usage Examples

#### Basic Usage
```tsx
import { useState } from 'react';
import Modal from './components/Modal';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Open Modal
      </Button>
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Basic Modal"
      >
        <p>This is a basic modal with some content.</p>
      </Modal>
    </>
  );
}
```

#### Advanced Usage
```tsx
// Confirmation dialog
<Modal
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  title="Confirm Deletion"
  size="sm"
  closeOnOverlayClick={false}
>
  <div className="text-center">
    <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
    <p className="text-gray-700 mb-6">
      Are you sure you want to delete this project? This action cannot be undone.
    </p>
    <div className="flex space-x-3">
      <Button variant="danger" onClick={handleDelete}>
        Delete Project
      </Button>
      <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
        Cancel
      </Button>
    </div>
  </div>
</Modal>

// Form modal
<Modal
  isOpen={showCreateForm}
  onClose={() => setShowCreateForm(false)}
  title="Create New Project"
  size="lg"
>
  <form onSubmit={handleSubmit}>
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Project name"
        className="w-full p-3 border rounded-lg"
      />
      <textarea
        placeholder="Project description"
        className="w-full p-3 border rounded-lg h-32"
      />
    </div>
    <div className="flex justify-end space-x-3 mt-6">
      <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
        Cancel
      </Button>
      <Button type="submit" variant="primary">
        Create Project
      </Button>
    </div>
  </form>
</Modal>
```

#### Common Patterns
```tsx
// Loading modal
<Modal
  isOpen={isProcessing}
  onClose={() => {}} // Prevent closing during processing
  title="Processing..."
  closeOnOverlayClick={false}
  closeOnEscape={false}
  showCloseButton={false}
>
  <div className="text-center py-8">
    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
    <p>Please wait while we process your request...</p>
  </div>
</Modal>

// Image gallery modal
<Modal
  isOpen={showGallery}
  onClose={() => setShowGallery(false)}
  size="full"
  className="bg-black"
>
  <ImageGallery images={images} />
</Modal>
```

### Accessibility

#### ARIA Support
- `role="dialog"` on modal container
- `aria-modal="true"` to indicate modal state
- `aria-labelledby` pointing to title element
- `aria-describedby` for modal content
- Proper focus management with focus trap

#### Keyboard Interactions
| Key | Action |
|-----|--------|
| `Escape` | Closes modal (if enabled) |
| `Tab` | Cycles through focusable elements |
| `Shift + Tab` | Reverse tab order |

#### Focus Management
- Focus moves to modal when opened
- Focus is trapped within modal
- Focus returns to trigger element when closed
- First focusable element receives initial focus

#### Screen Reader Support
- Modal opening/closing announced
- Title and content properly associated
- Background content hidden from screen readers
- Loading states communicated

### Styling & Theming

#### CSS Classes
```css
/* Overlay */
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50;
}

/* Modal container */
.modal-container {
  @apply bg-white rounded-2xl shadow-2xl max-h-full overflow-auto;
}

/* Sizes */
.modal-sm { @apply max-w-md; }
.modal-md { @apply max-w-2xl; }
.modal-lg { @apply max-w-4xl; }
.modal-xl { @apply max-w-6xl; }
.modal-full { @apply max-w-none w-full h-full; }

/* Animations */
.modal-enter {
  @apply opacity-0 scale-95;
}

.modal-enter-active {
  @apply opacity-100 scale-100 transition-all duration-300;
}

.modal-exit {
  @apply opacity-100 scale-100;
}

.modal-exit-active {
  @apply opacity-0 scale-95 transition-all duration-300;
}
```

### Edge Cases & Error Handling

#### Common Edge Cases
1. **Modal opened while another modal is open**: Stacks properly with z-index management
2. **Very tall content**: Scrollable with proper focus management
3. **Mobile viewport**: Responsive sizing and touch-friendly interactions
4. **Slow content loading**: Loading states and skeleton screens

#### Error Scenarios
- **Missing onClose**: Modal cannot be closed, shows development warning
- **Invalid size**: Falls back to 'md' size
- **Focus trap failure**: Graceful fallback to manual focus management
- **Animation conflicts**: CSS transitions handle overlapping states

### Performance Considerations

- **Lazy mounting**: Modal content only renders when open
- **Portal rendering**: Uses React Portal for proper DOM hierarchy
- **Animation optimization**: CSS transforms for 60fps animations
- **Memory management**: Cleans up event listeners on unmount

### Related Components

- **Toast**: For non-blocking notifications
- **Dropdown**: For menu-style overlays
- **Sidebar**: For persistent side panels
- **Popover**: For contextual information

---

**Last Updated**: January 15, 2024  
**Maintainer**: NexusFlow UI Team  
**Status**: Stable