"""Expected application failures, separate from programming errors."""


class AccountNotFound(KeyError):
    """A validated selection is absent from the loaded snapshot."""
