<div id="top"></div>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
<h3 align="center">Smart Contract Examples and Samples</h3>

  <p align="center">
    <a href="https://github.com/smartcontractkit/smart-contract-examples/issues">Report Bug</a>
    ·
    <a href="https://github.com/smartcontractkit/smart-contract-examples/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
    </li>
    <li>
    <a href="#downloading-a-single-directory">Downloading A Single Directory</a>
    </li>
    <li>
      <a href="#contributing">Contributing</a>
    </li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This repo contains example and sample projects, each in their own directory. 

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Each directory within this repo will have a `README.md` that details everything you need to run the sample.

## Downloading A Single Directory
```sh
# Create a directory, and enter it
mkdir smart-contract-examples && cd smart-contract-examples

# Initialize a Git repository
git init

# Add this repository as a remote origin
git remote add -f origin https://github.com/smartcontractkit/smart-contract-examples/

# Enable the tree check feature
git config core.sparseCheckout true

# Create the spare-checkout file with the value
# the directory you wish to download
#
# Use the name of the directory as 'REPLACE_ME'
echo 'REPLACE_ME' >> .git/info/sparse-checkout

## Download with pull
git pull origin master
```

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/smartcontractkit/smart-contract-examples.svg?style=for-the-badge
[contributors-url]: https://github.com/smartcontractkit/smart-contract-examples/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/smartcontractkit/smart-contract-examples.svg?style=for-the-badge
[forks-url]: https://github.com/smartcontractkit/smart-contract-examples/network/members
[stars-shield]: https://img.shields.io/github/stars/smartcontractkit/smart-contract-examples.svg?style=for-the-badge
[stars-url]: https://github.com/smartcontractkit/smart-contract-examples/stargazers
[issues-shield]: https://img.shields.io/github/issues/smartcontractkit/smart-contract-examples.svg?style=for-the-badge
[issues-url]: https://github.com/smartcontractkit/smart-contract-examples/issues