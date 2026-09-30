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

> **Important Notice**  
> Please be aware that this repository contains reference and example contracts which may be **unaudited** and could include **hard-coded values**.  
> Ensure that you review and audit any contracts before using them in production.

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

Disclaimer: Please note, this repo contains community examples only  — these are not Chainlink products or services and are not supported or maintained by Chainlink. This code represents an example of using a Chainlink product or service, and is intended for demonstration and educational purposes only. It is provided “AS IS” and “AS AVAILABLE” without warranties of any kind, may not have been audited, and may omit checks or error handling. Each party intending to use this example code does so entirely at their own risk and must perform its own audits, security and code review, key management, and testing before any production deployment and ensure the operation and performance of such code matches expectations. Neither Chainlink Labs nor the Chainlink Foundation deploys, operates, monitors, maintains or endorses any deployment of this code. Note that this is not a Chainlink product, feature or service, and there are no commitments made with respect to the code, including compatibility with future Chainlink releases. You should not rely on this code without first conducting your own technical, engineering, and security review. This code is also outside the scope of any Chainlink bug bounty programs. Neither Chainlink Labs, the Chainlink Foundation, nor Chainlink node operators are responsible for outcomes due to errors in this example or how it is deployed or operated, or liable for any resulting claims or damages. Use of the Chainlink Network is subject to the Chainlink Foundation [Terms of Service](https://chain.link/terms), which provides important information and disclosures. By using this code, you acknowledge and agree to these terms.
