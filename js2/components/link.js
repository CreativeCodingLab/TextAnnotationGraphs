class Link {
    constructor(eventId, trigger, args) {
      this.eventId = eventId;
      this.trigger = trigger;
      this.arguments = args;
      console.log('trigger\t\t',trigger);
      console.log.apply(null, args);
    }
}
