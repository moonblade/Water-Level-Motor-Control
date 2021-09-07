# Water-Level-Motor-Control

A companion to water level indicator. Having a water level indicator is cool and all, dont get me wrong, but my lazy ass can't be bothered to get up and manually switch on the motor and switch it off when the indicator tells me to. So whats the solution? Of course, automate it.

The major issue preventing me from doing this along with the indicator was that the motor switch was an outdoor style, push on push off switch and it was a bit daunting to mess around with it and add my own relay circuits to it. So I had kept it aside for a while.

### Raspberry pi controller

In the meantime, I bought a raspberry pi, and wasn't really doing much on it, so thinking I should at least be using it for something, ended up setting up grafana, and prometheus on it to visualize the water levels in sweet graphs.

![image](https://user-images.githubusercontent.com/9362269/132270512-7c44fb35-45ae-483a-b195-0e09f2d6994c.png)

Then figured would mess around with it a tiny bit more, and ended up writing an overcomplicated piece of code that checks the measurements from the last 3 minutes from prometheus, averages it, and then displays that as the percentage. There was an intermittent issue that sometimes wrong readings would come up in the sensor on the motor, so wrote a filter that removes any reading that is greater than 2 standard deviations away from mean for the last 3 minutes, and then the average is taken. 

This worked well for a while, but prometheus was giving all sorts of errors. Couldn't be bothered to deal with them in the long run when changing timezone and the size gap were the solutions I had to content with, so scratched it all out and ended up just using a circular array to store the previous values and then doing the calculations on it instead. It works well. At presnt prometheus service is failing and need to debug why, but the graphs can wait for now

### Automatic controller

Figured I'd at least making some in roads on how to tackle this, so got a wemos d1 chip, and a four channel relay, and whipped up a quick prototype that could take instructions from firebase. Intentionally made it stupid and controlled by the rpi so that modifications can be made on the fly by changing rpi code without having to touch the chip. Anyway, it takes on or off command from the rtdb and if its internal state was different from the command given, it would turn on or off the motor as needed. There were some issues with me not understanding the wiring of the box, namely that the offswitch was a normally closed connection and the switch breaks the connection and not the other way around, so after a bit of headscratching ended up wiring that in series with the existing connection so that both the manual and the auto switch would work. Didn't want the hassle of a phone charger for power like last time, so wired up an ac to dc convertor within the circuit itself so that it could be powered with the current to motor itself.

connections
![image](https://user-images.githubusercontent.com/9362269/132271024-899ab56e-ccfe-4df7-83b6-5eef81ba003f.png)

assembled into its box
![image](https://user-images.githubusercontent.com/9362269/132271150-082d88fd-c467-496e-9a31-b242ba655d22.png)

Wiring into the switch
![image](https://user-images.githubusercontent.com/9362269/132271170-b57178d9-2abc-46dd-aec0-80a86678559c.png)

Final state
![image](https://user-images.githubusercontent.com/9362269/132271193-f7c9b6ee-e5ed-45c3-b3cf-0c57d9a6828d.png)


Added the corresponding code in raspberry pi code to turn it on and off when critical thresholds were reached and added a ui for user to control the settings and turn motor on and off manually and also to turn off automatic water control. Gave it a go and wonder of wonders, it worked.........for a day. 

Waking up the next day I see that it should have turned the motor on, but didnt'. It had broken the very next day, post mortem analysis showed that the relay rated for 10 A had pulled close to 15 A through it and thus had died on me. So chalked that upto a learning experience and figured the next version would need 30A relays.

### Auto controller v2

5V 30A relays are kinda hard to find, especially if you want them as multiple channel modules, you'd need to import them from US as they seem to be the only ones making it. So ordered a couple of relays, opted for single ones since the other ones would take too long, and started work on the next board.

Throughout this project I'd done pcb designs on eagle, and later [on easyEDA](https://easyeda.com/editor#id=b41bb882b032482bb2b21c925477a603) but whenever I try to get them printed (on normal paper as a test run), I'd find that it was too small, I dont know if its a library fault or the component I chose was wrong or some other printer settings. Even ignoring the pcb printing, when I tried to make holes on a copper clad to practice with a hand drill, the resulting "line" of holes was more like a curve and I'd have trouble fitting in anything close to an IC chip in it. So figured I still needed training before I could use custom pcbs, or better yet it would make sense to just print it commercially than go through this again.

Anyway for the second round, added a second ac to dc convertor so that I could determine the current state of the motor from external signals instead of relying on an internal toggle, this way I could turn off the motor even if it was turned on by hand. I had bought two relays figuring I could turn the two on switches with one and the off switch with the other, so when I got the board ready and wired it up that way, what ended up happening is that the motor could not be turned off. If you turn it off, it just turned back on again. Facepalm moment, thinking of connecting two different circuits in one relay.

Lesson learnt, ordered the next relay and waited for it. After it arrived, added that in and tested it. But it didn't seem to work properly, it worked in brief tests, ie it could turn off the motor when it was on, but nothing else. Wierd. So I took off the chip and tried to flash new code to it, only to realize the chip was not functioning anymore. So I ordered a couple of new chips and waited for it to arrive.

Meanwhile, the water level sensor up top decided it wanted to go for a swim and took a dive into the water tank killing itself. So ended up spending time creating a v2 for the sensor as well. Which was a whole another ordeal.

The fault implied a wrong connection somewhere in the board. Since this was already wired into the switch board, it was a pain in the ass to test each conenction. Finally figuring out that the board was fine, but I'd connected the two ac to dc convertors in reverse, the sensing one and the power one were interchanged. So connected it properly. And plugged in the new chips. The chips were working properly and doing their job but the raspberry pi code that I'd updated in the meantime was now broken, and the correct commands were not being sent to turn the motor on and off. Sigh. This is integration hell.

After two days of hard debugging, finally figured out the issue. It wasn't working ....wait for it..... because it was turned off in the settings. Sigh. Turned it on and it started working without a hitch.

new circuit
![image](https://user-images.githubusercontent.com/9362269/132272520-fc4b3dfb-e939-48e7-a574-6e1d59bea94a.png)

finished product in a shinier box
![image](https://user-images.githubusercontent.com/9362269/132272558-3e547a7d-a286-49df-a876-f6f8b5c5a6c2.png)

