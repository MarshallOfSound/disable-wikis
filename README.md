# Disable Wikis

Having wikis enabled and publicly editable can be a security concern, people
can use the trusted nature of your GitHub organization to convince people
to click nefarious links or run bad commands in their terminal.  As GitHub
doesn't provide a One Click solution to turning off wikis at an org level,
this script will do that for you.

## Usage

```bash
npx disable-wikis
```

Then follow the onscreen prompts, it will ask for a GitHub Personal Access
Token with certain scopes and then ask you to choose an organization.  It
will then roll through and disable wikis all **all** the repositories in that
org.  Please note that this doesn't delete any wiki content, re-enabling wikis
later will recover any content if you want it.
