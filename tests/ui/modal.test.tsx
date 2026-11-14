import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Button, Modal, Sheet } from '@/components/ui';

function ModalExample({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this trip?"
        description="This cannot be undone."
        dismissible={dismissible}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger">Delete</Button>
          </>
        }
      />
    </>
  );
}

describe('Modal', () => {
  it('is labelled, takes focus, and returns focus to the trigger on Escape', async () => {
    const user = userEvent.setup();
    render(<ModalExample />);
    const trigger = screen.getByRole('button', { name: 'Open' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Delete this trip?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    expect(dialog).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<ModalExample />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const close = screen.getByRole('button', { name: 'Close' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const remove = screen.getByRole('button', { name: 'Delete' });

    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(remove).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus(); // wrapped
    await user.tab({ shift: true });
    expect(remove).toHaveFocus(); // wrapped backwards
  });

  it('ignores Escape when not dismissible', async () => {
    const user = userEvent.setup();
    render(<ModalExample dismissible={false} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});

describe('Sheet', () => {
  it('opens as a labelled dialog and closes from its close button', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(true);
      return (
        <Sheet open={open} onClose={() => setOpen(false)} title="Stop details" side="end">
          Content
        </Sheet>
      );
    }
    render(<Example />);
    expect(screen.getByRole('dialog', { name: 'Stop details' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
