# NexusFlow Component Documentation

This directory contains comprehensive documentation for all reusable components in the NexusFlow project.

## Documentation Structure

Each component follows a standardized documentation format that includes:

- **Purpose & Overview**: What the component does and when to use it
- **API Reference**: Complete props/parameters documentation
- **Usage Examples**: Basic to advanced implementation examples
- **Accessibility**: ARIA support, keyboard navigation, screen reader compatibility
- **Styling & Theming**: CSS classes, customization options
- **Edge Cases**: Error handling and unusual scenarios
- **Performance**: Bundle size, optimization considerations
- **Testing**: Unit and integration test examples
- **Browser Support**: Compatibility matrix
- **Dependencies**: Internal and external requirements

## Available Components

### Core Components
- [Button](./components/Button.md) - Versatile button component with variants and states
- [Modal](./components/Modal.md) - Accessible modal dialog component

### Form Components
- Input - Text input with validation
- Select - Dropdown selection component
- Checkbox - Checkbox input with custom styling
- Radio - Radio button groups

### Navigation Components
- Header - Main navigation header
- Breadcrumbs - Navigation breadcrumb trail
- Pagination - Page navigation component

### Layout Components
- Container - Responsive container wrapper
- Grid - Flexible grid system
- Card - Content card component

### Feedback Components
- Toast - Non-blocking notifications
- Alert - Inline alert messages
- Loading - Loading states and spinners

### Data Display
- Table - Data table with sorting and filtering
- Badge - Status and category indicators
- Avatar - User profile images

## Documentation Guidelines

### Writing Component Documentation

1. **Start with the template**: Use `component-template.md` as your starting point
2. **Be comprehensive**: Cover all props, states, and edge cases
3. **Include examples**: Provide practical, copy-paste examples
4. **Test your examples**: Ensure all code examples actually work
5. **Update regularly**: Keep documentation in sync with component changes

### Code Examples

- Use TypeScript for all examples
- Include imports and necessary context
- Show both basic and advanced usage patterns
- Demonstrate error handling and edge cases

### Accessibility Documentation

- Document all ARIA attributes used
- List keyboard interactions
- Explain screen reader behavior
- Include accessibility testing examples

## Contributing to Documentation

### Adding New Component Documentation

1. Copy `component-template.md` to `components/YourComponent.md`
2. Fill in all sections thoroughly
3. Test all code examples
4. Add component to this README
5. Submit PR with documentation

### Updating Existing Documentation

1. Keep the same structure and format
2. Update version numbers and changelog
3. Test any changed examples
4. Update "Last Updated" date

## Documentation Standards

### Code Formatting
```tsx
// Use consistent formatting
<Component
  prop1="value"
  prop2={true}
  onAction={handleAction}
>
  Content
</Component>
```

### Prop Tables
- Always include Type, Default, Required columns
- Use TypeScript union types for enums
- Provide clear descriptions
- Mark required props with ✅

### Examples
- Start with basic usage
- Progress to advanced patterns
- Include common real-world scenarios
- Show error handling

## Tools and Resources

### Documentation Tools
- **Storybook**: Interactive component playground
- **TypeDoc**: Automatic API documentation generation
- **Jest**: Component testing framework
- **React Testing Library**: Accessibility-focused testing

### Useful Links
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Guidelines](https://webaim.org/)
- [React Accessibility Docs](https://reactjs.org/docs/accessibility.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Maintained by**: NexusFlow UI Team  
**Last Updated**: January 15, 2024