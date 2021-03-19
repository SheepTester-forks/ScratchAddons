# boingboingboingboingboingboingboingboingboing

This is a fork of
[ScratchAddons/ScratchAddons](https://github.com/ScratchAddons/ScratchAddons)
for whenever I feel like making a PR.

I won't be merging this branch upstream though!
That would be terrible.

Chances are,
the good stuff can be found
in a [different branch](https://github.com/SheepTester/ScratchAddons/branches).

## Git things

I probably know this already,
but if I end up forgetting everything
then this might help.

Clone the repo:

```sh
git clone https://github.com/SheepTester/ScratchAddons.git
cd ScratchAddons
git remote add upstream https://github.com/ScratchAddons/ScratchAddons.git
```

Branch off upstream:

```sh
git fetch upstream
git checkout upstream/develop
git checkout -b cool-new-branch-name
```

Update a branch:

```sh
git fetch upstream
git merge upstream/develop --no-ff
```

If I forget `--no-ff`
(I probably will),
it's not a big deal.
