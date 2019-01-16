# Allow2 Node-RED

The Node-RED Allow2 contribution package enables the development of flows in
[Node-RED](https://nodered.org/) which connect to the
[Allow2](http://www.allow2.com)
parental freedom platform for the purposes of controlling device access for children.


## Overview

Allow2 Node-RED enables you to put electricity quotas on lights and fans, etc for your children to teach responsibility.

You can also hook up to a smart switch or powerboard to automatically cut off power to gaming consoles when gaming time runs out.

For developers, adding Allow2 Parental Freedom to your products is about increasing your addressable demographic (ie, getting MORE users),
it is NOT about reducing users!

Let's remove the hurdles for parents together and increase global accessibility to the latest and greatest technologies and services.

# Getting Started

The easiest way to get started is to drop Allow2 check node into a flow with an inject and debug nodes to test how it works:

![Getting Started](https://github.com/Allow2/allow2nodered/raw/master/images/gettingstarted.png "Getting Started")

In order to make use of the Allow2 Platform, you need an account. You can create one here for free:
<a target="Allow2" href="https://app.allow2.com" alt="Create Account">https://app.allow2.com</a>.

To pair (link) node-red to Allow2, open the check node and select "Add New Allow2Pairing..."

![Link to Allow2](https://github.com/Allow2/allow2nodered/raw/master/images/createpairing.png "Create Pairing")

Then use your Allow2 login to generate a token.

![Generate Token](https://github.com/Allow2/allow2nodered/raw/master/images/generatetoken.png "Generate Token")

Once the token is generated, the node is paired with Allow2.

![Paired](https://github.com/Allow2/allow2nodered/raw/master/images/paired.png "Paired")

You can save the node and then configure your check node.

![Configure Check Node](https://github.com/Allow2/allow2nodered/raw/master/images/configurecheck.png "Configure Check Node")

<b>DON'T FORGET TO DEPLOY!</b> The nodes will not work correctly with new pairings until you deploy the flow.


# Usage

To use the Allow2 platform, you need to send a payload to the <b>check</b> node containing at least one activity you want to check.

The platform will determine the quotas, usage, current restrictions, types of day and much more
(play with the Allow2 account at <a target="Allow2" href="https://app.allow2.com" alt="Allow2">https://app.allow2.com</a> to find out what you can do, there's a lot there).

It then returns a json package containing information about whether or not the current activity is allowed, and lots of additional information about the
various limitations and allowances, day types and such that led to that final result.

For example, a minimal msg.payload could be:

'''json
{
    "log": true,
    "activities": [
        { "id": 3, "log": true }
    ]
}
'''

Which only checks current ability to use the "Gaming" activity (ie, allowed to play games now, and have not used up all gaming time for today).

Allow2NodeRed currently supports the following activities:

---
| Id | Activity |
---
| 1 | Internet|
| 2 | Computer |
| 3 | Gaming |
| 7 | Electricity |
| 8 | Screen Time |
| 9 | Social |
| 10 | Phone Time |
---

You can technically use the "counter" activities such as "Messages", let us know if you do that and your specific use case. Would be great to hear from you.

On a successful call, the input msg will be sent to the output and it will be annotated with an additional result field, eg:

'''javascript
{
    "log": true,
    "activities": [
        { "id": 3, "log": true }
    ],
    result: {
        "allowed":false,    // overall, not allowed, below you can see they
                            // have run out of gaming time for today
        "activities": {
            "3": {          // activity 3 specific outcomes
                "id": 3,
                "name": "Gaming",
                "timed": true,
                "units": "minutes",
                "banned": false,
                "remaining": 0,         // child has run out of gaming time
                "cached": false,
                "expires": 1547351040,
                "timeBlock": {
                    "allowed": true,    // if they had not used up all their time,
                    "remaining": 437    // they could still play
                }
            }
        },
        "dayTypes": {
            "today":{
                "id": 23,               // today is a weekend
                "name": "Weekend"
            },
            "tomorrow": {
                "id": 86,               // tomorrow is a school day
                "name": "School Day"
            }
        },

        // the following will be more useful in node-red later and are standard inclusions
        // in responses from the Allow2 platform

        "allDayTypes": [                // all the day types in your account
            { "id": 23, "name": "Weekend" },
            { "id": 77, "name": "Weekday" },
            { "id": 86, "name": "School Day" },
            { "id": 64, "name": "Sick Day" },
            { "id": 66, "name": "Holiday" },
            { "id": 16997, "name": "No Limit" }
        ],
        "children":[                    // all the children in your account
            { "id": 8542, "name": "Mary", "pin": "8825" },
            { "id": 21413, "name": "Mike", "pin": "4595" }
        ],
        "subscription":{                // are you currently subscribed?
            "active": false,
            "type": 1,
            "maxChildren": 6,
            "childCount": 3,
            "deviceCount": 8,
            "serviceCount": 0,
            "financial": false
        }
    }
}
'''

So looking for msg.payload.result.allowed == true/false is the simplest way to determine if the child is allowed to perform the
requested activities at this time.

The additional information let's you figure out why that is the overall result and perhaps
be a little more detailed in any feedback to the child.

## A More Complex (And Useful) Example

In this flow, we use the built-in Allow2 timer mechanism.

![XBox Example](https://github.com/Allow2/allow2nodered/raw/master/images/xbox.png "XBox Example")

The idea is that when the home-automation socket is turned on, the first node triggers a payload to start checking if gaming is allowed.
The timer payload includes the "timer": "start" parameter to tell the check node it is to continually check if access is still allowed.

The "autostop" parameter will tell the timer in the Allow2 Check node to turn off the timer and stop checking the first time the response
comes back as "allowed":false

'''json
{
    "log": true,
    "activities": [
        {
            "id": 3
        }
    ],
    "timer": "start",
    "autostop": true
}
'''

Then on the output from the check node, we just need to check if msg.payload.result.allowed is false. If so, pass the message through to turn off the
power to the XBox.

# Advanced Usage

As the msg.payload.result contains information on remaining time allowances, and the time until certain activities are scheduled to
cease (like bed time), you can use the checks to perhaps send emails or push notifications to children, speak a warning over
homepod or alexa, and/or flash a light bulb (or more).

Maybe post to facebook or twitter if your children leave their lights on?

Let us know what novel automations you come up with.

You are only limited by your imagination.

# More Information and Developer Documentation

See the [Project Documentation and Rationale](https://allow2.github.io/)
for an overview of the Allow2 platform.

See the [Allow2Node client library](https://github.com/Allow2/Allow2node)
github project for javascript-based API documentation.

## Bugs and Feedback

For bugs, questions and discussions please use the
[GitHub Issues](https://github.com/Allow2/Allow2NodeRED/issues).

## LICENSE

MIT License

Copyright (c) 2018 Allow2

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

