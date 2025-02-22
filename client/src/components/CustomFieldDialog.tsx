import { useState, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

interface Props {
    open: boolean;
    onProceed: (fieldName: string) => void;
    onCancel: () => void;
    existingCustomFieldNames: string[];
}

export default function CustomFieldDialog({ open, onProceed, onCancel, existingCustomFieldNames }: Props) {
    const [fieldName, setFieldName] = useState<string>('');

    useEffect(() => {
        setFieldName('');
    }, [open]);

    const fieldExists = [
        ...existingCustomFieldNames,
        'Sentence',
        'Word',
        'Definition',
        'Source',
        'Image',
        'Audio',
    ].includes(fieldName);

    return (
        <Dialog
            open={open}
            disableEnforceFocus
            fullWidth
            maxWidth="xs"
            onClose={onCancel}
        >
            <DialogTitle>New Custom Field</DialogTitle>
            <DialogContent>
                <form>
                    <TextField
                        error={fieldExists}
                        helperText={fieldExists && `Field ${fieldName} already exists`}
                        variant="filled"
                        fullWidth
                        label="Field Name"
                        value={fieldName}
                        color="secondary"
                        onChange={(e) => setFieldName(e.target.value)}
                    />
                </form>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onCancel()}>Cancel</Button>
                <Button disabled={fieldExists || fieldName.trim() === ''} onClick={() => onProceed(fieldName.trim())}>
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
