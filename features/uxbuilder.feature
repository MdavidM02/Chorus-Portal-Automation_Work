@uxbuilder 
Feature: Chorus UX Builder Regression

@uxbuilder-scenario1
 Scenario: Chorus UX Builder Drag and Drop 
  Given I launch the UX Builder portal
  When I login with username and password for "TestCase7"
  When I create a New Project for "TestCase7"
  When I drag and drop sourceElement and TargetElement for "TestCase7"
  When I click on Home, Templates tab and open the published Template for "TestCase7"
  When I drag and drop more items to the published Template for "TestCase7"
